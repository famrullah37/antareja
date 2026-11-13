"use server";
import { batasiAksi } from "@/lib/rateLimit";

import { cekDataPemesan } from "@/lib/validasi";
import { getServerSession } from "@/lib/next-auth";
import { revalidatePath } from "next/cache";
import { sendMailTo } from "@/lib/mailer";
import QRCode from "qrcode";
import { buildDynamicQrisImage, decodeQrisFromImage } from "@/lib/qris";
import { catatLog } from "@/lib/activityLog";
import { awalanDariKodePendek, kodeTiketPendek, labelBundling, namaTiket, punyaBundling, totalBayarTiket } from "@/lib/tiket";

// Pengaturan tiket (master, harga, bundling, rekening/QRIS): ADMIN & BENDAHARA.
async function requireAdmin() {
  const session = await getServerSession();
  if (!["ADMIN", "BENDAHARA"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
}

// Operasional (jual offline/POS, verifikasi, scan): ditambah petugas TIKET.
// Petugas tiket (TIKET) hanya untuk POS (jual langsung + tandai tiket online
// diambil) — verifikasi pembayaran & scanner pintu masuk tetap Admin/Bendahara.
async function requireAdminOrTiket() {
  const session = await getServerSession();
  if (!["ADMIN", "BENDAHARA", "TIKET"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
}
import {
  createTiket,
  createTransaksiTiket,
  deleteTiket,
  findKonfigTiket,
  findTransaksiTiket,
  incrementCounterUrutTiket,
  updateTiket,
  updateTransaksiTiket,
  upsertKonfigTiket,
} from "@/queries/tiket.query";
import { imageUploader, validateUploadFile, bufferBukti } from "./fileUploader";
import prisma from "@/lib/prisma";
import { escapeHtml } from "@/lib/escapeHtml";
import { formatJamWib } from "@/lib/ujiCoba";
import { buatKuitansiTiket } from "@/lib/kuitansiPenjualan";
import { blokRingkasanPembayaran, kirimEmailPesananDiterima, notifPembayaranMasuk, type RingkasanPembayaran } from "@/lib/emailPembayaran";
import { cekTokenKode, terbitkanTokenKode } from "@/lib/kodeUnikToken";
import { cekTandaPesanan, linkPesananTiket } from "@/lib/linkPesanan";

// Ringkasan nominal transaksi tiket untuk email (pesanan diterima & verifikasi).
function ringkasanTiket(tr: {
  jumlah: number;
  kodeUnik: string | null;
  bundleJumlah: number;
  bundleHarga: number;
  bundleIsi: string | null;
  metodePembayaran: string;
  createdAt: Date;
  tiket: { jenis: string; harga: number };
}): RingkasanPembayaran {
  return {
    kodeUnik: tr.kodeUnik,
    totalBayar: totalBayarTiket(tr),
    metodePembayaran: tr.metodePembayaran,
    tanggal: tr.createdAt,
    rincian: [
      { label: `${namaTiket(tr.tiket.jenis)} × ${tr.jumlah}`, nominal: tr.tiket.harga * tr.jumlah },
      ...(tr.bundleJumlah > 0
        ? [{ label: `Bundling ${tr.bundleIsi ?? ""} × ${tr.bundleJumlah}`.trim(), nominal: tr.bundleHarga * tr.bundleJumlah }]
        : []),
    ],
  };
}

// Pesanan tiket wajib yang masih berlaku (PENDING/VERIFIED) milik akun ini.
// Pesanan DITOLAK tidak dihitung — tim boleh memesan ulang.
async function pesananWajibAktif(
  db: Pick<typeof prisma, "transaksiTiket">,
  tiketId: string,
  userId: string
) {
  const n = await db.transaksiTiket.count({
    where: { tiketId, userId, status: { in: ["PENDING", "VERIFIED"] } },
  });
  return n > 0;
}

// Tiket yang sedang "ditahan" pesanan online PENDING. `sisa` baru dipotong saat
// admin memverifikasi, jadi tanpa ini pesanan yang menunggu verifikasi tidak
// dihitung dan tiket yang sebenarnya sudah habis tetap bisa dipesan.
async function jumlahTertahan(db: Pick<typeof prisma, "transaksiTiket">, tiketId: string) {
  const agg = await db.transaksiTiket.aggregate({
    where: { tiketId, status: "PENDING" },
    _sum: { jumlah: true },
  });
  return agg._sum.jumlah ?? 0;
}

// Jumlah tiket wajib per tim dari form admin (minimal 1).
function parseJumlahPerTim(data: FormData) {
  const n = parseInt((data.get("jumlahPerTim") as string) || "1");
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

// ─── Admin: Master Tiket ──────────────────────────────────────────────────────

// Bundling kosong/0 = nonaktif (disimpan null supaya jelas tidak ada bundling)
function parseBundling(data: FormData) {
  const harga = parseInt((data.get("bundleHarga") as string) || "0");
  const isi = ((data.get("bundleIsi") as string) || "").trim();
  if (!Number.isFinite(harga) || harga <= 0 || !isi) return { bundleHarga: null, bundleIsi: null };
  return { bundleHarga: harga, bundleIsi: isi };
}

export async function createTiketAdmin(data: FormData) {
  await requireAdmin();
  const jenis = data.get("jenis") as string;
  const harga = parseInt(data.get("harga") as string);
  const kuota = parseInt(data.get("kuota") as string);
  const khususTim = data.get("khususTim") === "on";
  const khususOts = data.get("khususOts") === "on";
  if (khususTim && khususOts)
    return { success: false, message: "Tiket tidak bisa sekaligus wajib tim dan OTS" };
  try {
    await createTiket({
      jenis, harga, kuota, sisa: kuota, khususTim, khususOts, jumlahPerTim: parseJumlahPerTim(data), ...parseBundling(data),
    });
    revalidatePath("/tiket");
    revalidatePath("/admin/tiket");
    return { success: true };
  } catch { return { success: false }; }
}

export async function updateTiketAdmin(data: FormData, id: string) {
  await requireAdmin();
  const jenis = data.get("jenis") as string;
  const harga = parseInt(data.get("harga") as string);
  const kuota = parseInt(data.get("kuota") as string);
  if (!Number.isInteger(kuota) || kuota < 0) return { success: false, message: "Kuota tidak valid" };
  try {
    // Ubah kuota → sisa ikut bergeser sebesar selisihnya (dulu sisa tidak ikut
    // berubah, jadi menurunkan kuota tidak membuat tiket habis).
    await prisma.$transaction(async (tx) => {
      const lama = await tx.tiket.findUnique({ where: { id }, select: { kuota: true, sisa: true } });
      if (!lama) throw new Error("TIKET_TIDAK_DITEMUKAN");
      const sisa = Math.max(0, lama.sisa + (kuota - lama.kuota));
      await tx.tiket.update({ where: { id }, data: { jenis, harga, kuota, sisa, ...parseBundling(data) } });
    });
    revalidatePath("/tiket");
    revalidatePath("/admin/tiket");
    return { success: true };
  } catch { return { success: false }; }
}

// Tambah stok tiket (mis. saat sudah habis) — kuota & sisa naik bersamaan secara
// atomik. Hanya penambahan; tidak bisa mengurangi supaya tiket yang sudah
// terjual/terverifikasi tidak ikut "hilang".
export async function tambahKuotaTiket(id: string, tambahan: number) {
  await requireAdmin();
  if (!Number.isInteger(tambahan) || tambahan < 1 || tambahan > 10000)
    return { success: false, message: "Jumlah tambahan tidak valid (1–10.000)" };
  try {
    const tiket = await prisma.tiket.update({
      where: { id },
      data: { kuota: { increment: tambahan }, sisa: { increment: tambahan } },
    });
    await catatLog("TAMBAH_KUOTA_TIKET", `Tiket ${tiket.jenis}: +${tambahan} (kuota ${tiket.kuota}, sisa ${tiket.sisa})`);
    revalidatePath("/admin/tiket");
    revalidatePath("/admin/tiket/pos");
    revalidatePath("/tiket");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function updateBundlingTiket(data: FormData, id: string) {
  await requireAdmin();
  try {
    const bundling = parseBundling(data);
    const tiket = await updateTiket({ id }, bundling);
    await catatLog(
      "UBAH_BUNDLING_TIKET",
      bundling.bundleHarga
        ? `Tiket ${tiket.jenis}: +Rp${bundling.bundleHarga} dapat ${bundling.bundleIsi}`
        : `Tiket ${tiket.jenis}: bundling dinonaktifkan`
    );
    revalidatePath("/admin/tiket");
    revalidatePath("/admin/tiket/pos");
    revalidatePath("/tiket");
    return { success: true };
  } catch { return { success: false }; }
}

// Siapa yang boleh membeli tiket: UMUM (online & loket), TIM (wajib tim, hanya
// online oleh akun tim), OTS (hanya di loket lewat POS Tiket).
export type PembeliTiket = "UMUM" | "TIM" | "OTS";

export async function setPembeliTiket(id: string, pembeli: PembeliTiket, jumlahPerTim = 1) {
  await requireAdmin();
  if (!["UMUM", "TIM", "OTS"].includes(pembeli)) return { success: false, message: "Pilihan pembeli tidak valid" };
  if (pembeli === "TIM" && (!Number.isInteger(jumlahPerTim) || jumlahPerTim < 1))
    return { success: false, message: "Jumlah per tim minimal 1" };
  try {
    const khususTim = pembeli === "TIM";
    const khususOts = pembeli === "OTS";
    const tiket = await updateTiket({ id }, khususTim ? { khususTim, khususOts, jumlahPerTim } : { khususTim, khususOts });
    await catatLog(
      "UBAH_TIKET_PEMBELI",
      `Tiket ${tiket.jenis}: ${
        khususTim ? `wajib tim, ${jumlahPerTim} tiket per tim` : khususOts ? "OTS, hanya dijual di loket" : "terbuka untuk umum"
      }`
    );
    revalidatePath("/admin/tiket");
    revalidatePath("/admin/tiket/pos");
    revalidatePath("/tiket");
    revalidatePath("/");
    return { success: true };
  } catch { return { success: false }; }
}

export async function saveKonfigTiket(data: FormData) {
  await requireAdmin();
  const bankNama = data.get("bankNama") as string;
  const bankNoRek = data.get("bankNoRek") as string;
  const bankAtasNama = data.get("bankAtasNama") as string;
  const qrisFile = data.get("qris") as File;

  try {
    const update: Parameters<typeof upsertKonfigTiket>[0] = {
      bankNama, bankNoRek, bankAtasNama,
    };
    let qrisTerbaca = true;
    if (qrisFile && qrisFile.size > 0) {
      const fileCheck = await validateUploadFile(qrisFile);
      if (!fileCheck.valid) return { success: false, message: fileCheck.message };
      const buffer = Buffer.from(await qrisFile.arrayBuffer());
      const upload = await imageUploader(buffer);
      if (upload.error) return { success: false, message: upload.message };
      update.qrisUrl = upload.data!.url;
      const payload = await decodeQrisFromImage(buffer);
      update.qrisPayload = payload;
      qrisTerbaca = !!payload;
    }
    await upsertKonfigTiket(update);
    revalidatePath("/admin/tiket");
    revalidatePath("/tiket");
    revalidatePath("/galeri");
    return {
      success: true,
      message: qrisTerbaca ? undefined : "Konfigurasi disimpan, tapi kode QRIS pada gambar tidak terbaca — QRIS dinamis nonaktif, tetap memakai gambar QRIS statis.",
    };
  } catch {
    return { success: false };
  }
}

// ─── Publik: QRIS Dinamis (dipakai Tiket & Galeri Foto Premium) ──────────────

export async function getDynamicQrisTiket(amount: number) {
  const dibatasi = await batasiAksi("qris", 200, 10 * 60 * 1000);
  if (dibatasi) return { success: false, message: dibatasi };
  if (!Number.isFinite(amount) || amount <= 0) return { success: false };
  try {
    const konfig = await findKonfigTiket();
    const dataUrl = await buildDynamicQrisImage(konfig?.qrisPayload, amount);
    if (!dataUrl) return { success: false };
    return { success: true, dataUrl };
  } catch {
    return { success: false };
  }
}

export async function deleteTiketAdmin(id: string) {
  await requireAdmin();
  try {
    await deleteTiket({ id });
    revalidatePath("/admin/tiket");
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ─── User: Beli Tiket ─────────────────────────────────────────────────────────

// Cadangkan kode unik 3 digit secara atomik (counter di KonfigTiket, sama
// pola dengan reserveKodeVoting/reserveKodePendaftaran) — dipanggil dari
// form begitu jenis tiket & jumlah dipilih, supaya nominal yang ditampilkan
// (harga + kode unik) sudah pasti sebelum user membayar.
export async function reserveKodeTiket() {
  const dibatasi = await batasiAksi("kode", 120, 10 * 60 * 1000);
  if (dibatasi) return { success: false, message: dibatasi };
  try {
    const updated = await incrementCounterUrutTiket();
    const kodeUnik = String(updated.counterUrutTiket % 1000).padStart(3, "0");
    return { success: true, kodeUnik, ...terbitkanTokenKode(kodeUnik) };
  } catch (e) {
    console.error("reserveKodeTiket error:", e);
    return { success: false };
  }
}

export async function beliTiket(data: FormData) {
  const dibatasi = await batasiAksi("beli", 40, 10 * 60 * 1000);
  if (dibatasi) return { success: false, message: dibatasi };
  // userId dari sesi, bukan dari klien — kalau dari klien, siapa pun bisa
  // menempelkan transaksinya ke akun orang lain.
  const userId = (await getServerSession())?.user?.id;
  const tiketId = data.get("tiketId") as string;
  const jumlah = parseInt(data.get("jumlah") as string);
  const bundleJumlah = parseInt((data.get("bundleJumlah") as string) || "0");
  const nama = data.get("nama") as string;
  const email = data.get("email") as string;
  const noHp = data.get("noHp") as string;
  const bukti = data.get("bukti") as File | null;
  const metodePembayaran = (data.get("metodePembayaran") as string) || "TRANSFER";
  const kodeUnik = data.get("kodeUnik") as string | null;

  if (metodePembayaran !== "TRANSFER" && metodePembayaran !== "QRIS") {
    return { success: false, message: "Metode pembayaran online hanya QRIS atau Transfer" };
  }
  if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > 100)
    return { success: false, message: "Jumlah tiket tidak valid (1–100)" };
  const salahData = cekDataPemesan({ nama, email, noHp });
  if (salahData) return { success: false, message: salahData };

  // Bukti WAJIB untuk Transfer maupun QRIS (aturan panitia: verifikasi
  // berdasarkan bukti, bukan hanya mencocokkan nominal).
  if (!bukti || bukti.size === 0) {
    return { success: false, message: "Bukti pembayaran wajib diunggah — untuk QRIS, screenshot bukti berhasil dari aplikasi pembayaran" };
  }
  if (!kodeUnik || !/^\d{3}$/.test(kodeUnik)) {
    return { success: false, message: "Kode pembayaran tidak valid, silakan pilih ulang jumlah tiket" };
  }
  if (metodePembayaran === "QRIS") {
    const salahKode = cekTokenKode(data.get("kodeToken"), kodeUnik);
    if (salahKode) return { success: false, message: salahKode };
  }

  // Cek tiket & stok SEBELUM upload — jangan buang kuota Cloudinary untuk pembelian
  // yang pasti gagal (stok tetap dicek ulang secara atomik di transaksi bawah).
  const tiketCek = await prisma.tiket.findUnique({
    where: { id: tiketId },
    select: { sisa: true, khususTim: true, khususOts: true, jumlahPerTim: true },
  });
  if (!tiketCek) return { success: false, message: "Tiket tidak ditemukan" };
  if (tiketCek.khususOts)
    return { success: false, message: "Tiket OTS hanya dijual di loket pada hari acara" };
  // Tiket wajib tim: wajib login dengan akun yang sudah mendaftarkan tim,
  // jumlah ditetapkan admin (jumlahPerTim), dan hanya satu pesanan aktif per tim.
  if (tiketCek.khususTim) {
    const punyaTim = userId ? (await prisma.tim.count({ where: { userId } })) > 0 : false;
    if (!punyaTim) {
      return { success: false, message: "Tiket ini wajib untuk tim peserta — login dengan akun tim untuk membelinya" };
    }
    if (jumlah !== tiketCek.jumlahPerTim) {
      return { success: false, message: `Jumlah tiket wajib untuk tiap tim adalah ${tiketCek.jumlahPerTim} tiket` };
    }
    if (await pesananWajibAktif(prisma, tiketId, userId!)) {
      return { success: false, message: "Tim kamu sudah memesan tiket wajib ini — cek di dashboard tim" };
    }
  }
  if (tiketCek.sisa - (await jumlahTertahan(prisma, tiketId)) < jumlah)
    return { success: false, message: "Stok tiket tidak mencukupi" };

  // Upload bukti dulu sebelum transaksi DB
  let buktiUrl: string | undefined;
  if (bukti && bukti.size > 0) {
    const fileCheck = await validateUploadFile(bukti);
    if (!fileCheck.valid) return { success: false, message: fileCheck.message };
    const upload = await imageUploader(await bufferBukti(bukti));
    if (upload.error) {
      console.error("Upload bukti gagal:", upload.message);
      return { success: false, message: upload.message };
    }
    buktiUrl = upload.data?.url;
  }

  try {
    // Atomic: kunci per tiket supaya dua pesanan bersamaan tidak sama-sama lolos
    // cek stok, lalu stok tersedia = sisa − pesanan PENDING (sisa baru dipotong
    // saat verifikasi).
    const dibuat = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${`tiket-stok:${tiketId}`}))) AS kunci`;
      const tiket = await tx.tiket.findUnique({ where: { id: tiketId } });
      if (!tiket || tiket.khususOts) throw new Error("TIKET_TIDAK_DITEMUKAN");
      if (jumlah < 1) throw new Error("JUMLAH_INVALID");
      if (tiket.sisa - (await jumlahTertahan(tx, tiketId)) < jumlah) throw new Error("STOK_KURANG");
      if (!Number.isInteger(bundleJumlah) || bundleJumlah < 0 || bundleJumlah > jumlah)
        throw new Error("BUNDLE_INVALID");
      if (bundleJumlah > 0 && !punyaBundling(tiket)) throw new Error("BUNDLE_INVALID");
      // Cek ulang di dalam transaksi: cegah dua klik/tab membuat dua pesanan wajib.
      // Advisory lock per (akun, tiket) — tanpa ini dua request bersamaan sama-sama
      // melihat "belum ada pesanan" (READ COMMITTED) dan dua-duanya lolos.
      if (tiket.khususTim) {
        if (!userId || jumlah !== tiket.jumlahPerTim) throw new Error("WAJIB_TIM_INVALID");
        await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${`tiket-wajib:${userId}:${tiketId}`}))) AS kunci`;
        if (await pesananWajibAktif(tx, tiketId, userId)) throw new Error("WAJIB_TIM_INVALID");
      }

      // Cegah dua transaksi memakai kodeUnik yang sama — nominal transfer
      // harus presisi unik supaya admin gampang cocokkan mutasi/QRIS.
      const dipakai = await tx.transaksiTiket.findFirst({
        where: { kodeUnik, status: { in: ["PENDING", "VERIFIED"] } },
      });
      if (dipakai) throw new Error("KODE_UNIK_DIPAKAI");

      return tx.transaksiTiket.create({
        include: { tiket: true },
        data: {
          tiket: { connect: { id: tiketId } },
          jumlah,
          nama,
          email,
          noHp,
          ...(buktiUrl ? { bukti: buktiUrl } : {}),
          status: "PENDING",
          metodePembayaran,
          kodeUnik,
          ...(bundleJumlah > 0
            ? { bundleJumlah, bundleHarga: tiket.bundleHarga!, bundleIsi: tiket.bundleIsi }
            : {}),
          ...(userId ? { user: { connect: { id: userId } } } : {}),
        },
      });
    });
    const ringkasan = ringkasanTiket(dibuat);
    notifPembayaranMasuk({
      jenis: "Tiket",
      pathAdmin: "/admin/tiket",
      nama: dibuat.nama,
      kontak: `${dibuat.email} · ${dibuat.noHp}`,
      totalBayar: ringkasan.totalBayar,
      kodeUnik: dibuat.kodeUnik,
      metodePembayaran: dibuat.metodePembayaran,
      buktiUrl,
      detail: `${dibuat.jumlah}× ${dibuat.tiket.jenis}${dibuat.bundleJumlah ? ` (+${dibuat.bundleJumlah} bundling)` : ""}`,
    });
    const linkPesanan = linkPesananTiket(dibuat.id);
    // Tidak ditunggu: SMTP 2–5 detik tidak perlu menahan pembeli.
    void kirimEmailPesananDiterima({
      to: dibuat.email,
      nama: dibuat.nama,
      produk: "Tiket",
      ringkasan,
      keterangan: "QR code tiket akan dikirim ke email ini setelah pembayaran diverifikasi panitia.",
      linkPesanan,
    });
    revalidatePath("/tiket");
    return { success: true, linkPesanan, adaBukti: !!buktiUrl };
  } catch (e: any) {
    const msg = e?.message ?? "";
    if (msg === "TIKET_TIDAK_DITEMUKAN") return { success: false, message: "Tiket tidak ditemukan" };
    if (msg === "JUMLAH_INVALID") return { success: false, message: "Jumlah tiket tidak valid" };
    if (msg === "STOK_KURANG") return { success: false, message: "Stok tiket tidak mencukupi" };
    if (msg === "BUNDLE_INVALID") return { success: false, message: "Jumlah paket bundling tidak valid (maksimal 1 per tiket)" };
    if (msg === "KODE_UNIK_DIPAKAI") return { success: false, message: "Kode unik sudah terpakai, silakan coba lagi" };
    if (msg === "WAJIB_TIM_INVALID")
      return { success: false, message: "Tim kamu sudah memesan tiket wajib ini, atau jumlahnya tidak sesuai ketentuan panitia" };
    console.error("beliTiket error:", e);
    return { success: false };
  }
}

// Upload bukti menyusul dari halaman pesanan (/tiket/pesanan/[id]) — untuk pembeli
// QRIS yang tadinya tidak mengunggah bukti, atau mengganti bukti yang salah.
// Hanya selama pesanan masih PENDING; akses lewat tanda di link pesanan.
export async function uploadBuktiTiket(data: FormData) {
  const dibatasi = await batasiAksi("bukti", 20, 10 * 60 * 1000);
  if (dibatasi) return { success: false, message: dibatasi };
  const id = data.get("id") as string;
  const bukti = data.get("bukti") as File | null;
  if (!id || !cekTandaPesanan(id, data.get("t"))) return { success: false, message: "Link pesanan tidak valid" };

  const fileCheck = await validateUploadFile(bukti);
  if (!fileCheck.valid) return { success: false, message: fileCheck.message };
  const tr = await prisma.transaksiTiket.findUnique({ where: { id }, include: { tiket: true } });
  if (!tr || tr.jenisJual !== "ONLINE") return { success: false, message: "Pesanan tidak ditemukan" };
  if (tr.status !== "PENDING") return { success: false, message: "Pesanan ini sudah diproses panitia" };

  const upload = await imageUploader(await bufferBukti(bukti!));
  if (upload.error || !upload.data?.url) {
    console.error("Upload bukti menyusul gagal:", upload.message);
    return { success: false, message: upload.message ?? "Gagal mengunggah bukti" };
  }
  try {
    const { count } = await prisma.transaksiTiket.updateMany({
      where: { id, status: "PENDING" },
      data: { bukti: upload.data.url },
    });
    if (count === 0) return { success: false, message: "Pesanan ini sudah diproses panitia" };
    notifPembayaranMasuk({
      jenis: "Tiket (bukti menyusul)",
      pathAdmin: "/admin/tiket",
      nama: tr.nama,
      kontak: `${tr.email} · ${tr.noHp}`,
      totalBayar: totalBayarTiket(tr),
      kodeUnik: tr.kodeUnik,
      metodePembayaran: tr.metodePembayaran,
      buktiUrl: upload.data.url,
      detail: `${tr.jumlah}× ${tr.tiket.jenis}${tr.bundleJumlah ? ` (+${tr.bundleJumlah} bundling)` : ""}`,
    });
    revalidatePath("/admin/tiket");
    return { success: true };
  } catch (e) {
    console.error("uploadBuktiTiket error:", e);
    return { success: false, message: "Gagal menyimpan bukti" };
  }
}

// ─── Admin: Penjualan Offline ────────────────────────────────────────────────

export async function jualTiketOffline(data: FormData) {
  await requireAdminOrTiket();
  const tiketId = data.get("tiketId") as string;
  const jumlah = parseInt(data.get("jumlah") as string);
  const bundleJumlah = parseInt((data.get("bundleJumlah") as string) || "0");
  const nama = data.get("nama") as string;
  const email = (data.get("email") as string) || "-";
  const noHp = (data.get("noHp") as string) || "-";
  const catatanAdmin = (data.get("catatanAdmin") as string) || null;
  const metodePembayaran = (data.get("metodePembayaran") as string) || "CASH";
  if (metodePembayaran !== "CASH" && metodePembayaran !== "QRIS")
    return { success: false, message: "Metode pembayaran POS hanya Cash atau QRIS" };
  const labelMetode = metodePembayaran === "QRIS" ? "QRIS" : "Tunai";

  try {
    const tiket = await prisma.tiket.findUnique({ where: { id: tiketId } });
    if (!tiket) return { success: false };
    if (!Number.isInteger(jumlah) || jumlah < 1)
      return { success: false, message: "Jumlah tidak valid" };
    if (tiket.sisa < jumlah)
      return { success: false, message: `Stok tiket tidak cukup (sisa ${tiket.sisa})` };
    if (!Number.isInteger(bundleJumlah) || bundleJumlah < 0 || bundleJumlah > jumlah)
      return { success: false, message: "Jumlah paket bundling tidak valid (maksimal 1 per tiket)" };
    if (bundleJumlah > 0 && !punyaBundling(tiket))
      return { success: false, message: "Tiket ini tidak punya bundling" };

    const transaksi = await createTransaksiTiket({
      tiket: { connect: { id: tiketId } },
      jumlah,
      nama,
      email,
      noHp,
      status: "VERIFIED",
      jenisJual: "OFFLINE",
      metodePembayaran,
      ...(bundleJumlah > 0
        ? { bundleJumlah, bundleHarga: tiket.bundleHarga!, bundleIsi: tiket.bundleIsi }
        : {}),
      ...(catatanAdmin ? { catatanAdmin } : {}),
    });

    // QR pertama sebanyak bundleJumlah ditandai berhak dapat isi bundling
    await prisma.qRTiket.createMany({
      data: Array.from({ length: jumlah }, (_, i) => ({
        transaksiId: transaksi.id,
        bundle: i < bundleJumlah,
      })),
    });

    await prisma.tiket.update({
      where: { id: tiketId },
      data: { sisa: { decrement: jumlah } },
    });

    const bundling = labelBundling(transaksi);
    await catatLog("JUAL_TIKET_OFFLINE", `Tiket ${tiket.jenis} × ${jumlah}${bundling} (${nama}) — ${labelMetode}`);

    await prisma.kasTransaksi.create({
      data: {
        tipe: "PEMASUKAN",
        keterangan: `Tiket ${tiket.jenis} × ${jumlah}${bundling} (${nama}) — POS ${labelMetode}`,
        jumlah: totalBayarTiket({ ...transaksi, tiket }),
        kategori: "TIKET",
        sumber: "TIKET",
        referensiId: transaksi.id,
      },
    });

    revalidatePath("/admin/tiket");
    revalidatePath("/admin/tiket/pos");
    revalidatePath("/admin/kas");
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ─── Admin: Verifikasi & QR ───────────────────────────────────────────────────

export async function verifikasiTiket(transaksiId: string) {
  await requireAdmin();
  try {
    const transaksi = await findTransaksiTiket({ id: transaksiId });
    if (!transaksi) return { success: false };
    if (transaksi.status === "VERIFIED") return { success: false, message: "Tiket sudah diverifikasi sebelumnya" };

    // Klaim atomik: hanya satu request yang bisa mengubah status ke VERIFIED —
    // cek-lalu-update biasa lolos dua kali bila tombol terkirim ganda (kas dobel).
    // Klaim status + QR + potong stok dalam SATU transaksi: kalau stok ternyata
    // tidak cukup (pesanan PENDING bisa melebihi kuota), semuanya dibatalkan —
    // dulu status sudah VERIFIED & QR terbuat tapi kas/email tidak jalan.
    const hasil = await prisma.$transaction(async (tx) => {
      const klaim = await tx.transaksiTiket.updateMany({
        where: { id: transaksiId, status: "PENDING" },  // hanya PENDING: transaksi DITOLAK tidak bisa diverifikasi ulang (kode unik-nya mungkin sudah dipakai transaksi lain)
        data: { status: "VERIFIED" },
      });
      if (klaim.count === 0) return "SUDAH_DIPROSES" as const;

      const stok = await tx.tiket.updateMany({
        where: { id: transaksi.tiketId, sisa: { gte: transaksi.jumlah } },
        data: { sisa: { decrement: transaksi.jumlah } },
      });
      if (stok.count === 0) throw new Error("STOK_KURANG");

      await tx.qRTiket.createMany({
        data: Array.from({ length: transaksi.jumlah }, (_, i) => ({
          transaksiId,
          bundle: i < transaksi.bundleJumlah,
        })),
      });
      return "OK" as const;
    }).catch((e) => {
      if (e?.message === "STOK_KURANG") return "STOK_KURANG" as const;
      throw e;
    });
    if (hasil === "SUDAH_DIPROSES") return { success: false, message: "Tiket sudah diproses (diverifikasi/ditolak) sebelumnya" };
    if (hasil === "STOK_KURANG")
      return { success: false, message: "Sisa kuota tiket tidak cukup untuk pesanan ini — tambah kuota atau tolak pesanan" };

    // Auto-kas — jumlah yang dicatat harus sama dengan nominal yang benar-benar
    // ditransfer (harga tiket + kode unik), bukan cuma harga dasarnya, supaya
    // laporan kas tidak menampilkan nominal yang sama berulang untuk tiket
    // sejenis (lihat juga verifikasiFoto di Galeri.ts, pola yang sama).
    const totalBayar = totalBayarTiket(transaksi);
    const bundling = labelBundling(transaksi);
    await catatLog(
      "VERIFIKASI_TIKET",
      `Tiket ${transaksi.tiket.jenis} × ${transaksi.jumlah}${bundling} (${transaksi.nama}) — Rp${totalBayar}`
    );
    await prisma.kasTransaksi.create({
      data: {
        tipe: "PEMASUKAN",
        keterangan: `Tiket ${transaksi.tiket.jenis} × ${transaksi.jumlah}${bundling} (${transaksi.nama})${transaksi.kodeUnik ? ` [#${transaksi.kodeUnik}]` : ""}`,
        jumlah: totalBayar,
        kategori: "TIKET",
        sumber: "TIKET",
        referensiId: transaksiId,
      },
    });

    // Ambil QR tokens yang baru dibuat + generate gambar QR
    const qrTikets = await prisma.qRTiket.findMany({ where: { transaksiId } });
    // QR sebagai lampiran inline (cid) — Gmail tidak menampilkan <img src="data:...">.
    const qrGambar = await Promise.all(
      qrTikets.map(async (q, i) => ({
        filename: `QR-Tiket-${i + 1}.png`,
        content: await QRCode.toBuffer(q.token, { width: 320, margin: 2 }),
        contentType: "image/png",
        cid: `qr-tiket-${i + 1}@antareja`,
      }))
    );
    const qrBlocks = qrTikets.map((q, i) => `
          <div style="display:inline-block;text-align:center;margin:8px">
            <div style="font-size:12px;font-weight:bold;margin-bottom:4px">Tiket #${i + 1}</div>
            ${q.bundle ? `<div style="font-size:11px;color:#b45309;margin-bottom:4px">+ ${transaksi.bundleIsi ?? "Bundling"}</div>` : ""}
            <img src="cid:${qrGambar[i].cid}" width="160" height="160" style="display:block;border-radius:8px;border:1px solid #e5e7eb" alt="QR Tiket ${i + 1}"/>
            <div style="font-size:14px;font-family:monospace;font-weight:bold;color:#444;margin-top:6px;letter-spacing:1px">${kodeTiketPendek(q.token)}</div>
          </div>`);

    // Kuitansi PDF dilampirkan ke email — gagal dibuat tidak menggagalkan verifikasi
    // (admin masih bisa mengunduhnya dari tabel transaksi).
    const kuitansi = await buatKuitansiTiket(transaksiId).catch((e) => {
      console.error("Gagal membuat kuitansi tiket:", e);
      return null;
    });

    // Kirim email
    try {
      await sendMailTo({
        to: transaksi.email,
        fileAttachments: [
          ...qrGambar,
          ...(kuitansi ? [{ filename: kuitansi.filename, content: kuitansi.pdf, contentType: "application/pdf" }] : []),
        ],
        subject: `✅ Tiket LPKBB Antareja 2026 — ${transaksi.tiket.jenis}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto">
            <h2 style="color:#F70048">Tiket Anda Terverifikasi!</h2>
            <p>Halo <b>${escapeHtml(transaksi.nama)}</b>,</p>
            <p>Pembelian tiket <b>${escapeHtml(transaksi.tiket.jenis)}</b> (${transaksi.jumlah} tiket) telah diverifikasi.</p>
            ${blokRingkasanPembayaran(ringkasanTiket(transaksi), "Lunas")}
            ${kuitansi ? `<p>Kuitansi pembayaran terlampir (No. <b>${kuitansi.nomor}</b>).</p>` : ""}
            ${transaksi.bundleJumlah > 0 ? `<p>Termasuk bundling <b>${transaksi.bundleIsi}</b> × ${transaksi.bundleJumlah} — diambil saat QR bertanda bundling di-scan di pintu masuk.</p>` : ""}
            <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0">
              <p style="margin:0 0 12px;font-weight:bold">QR Code Tiket Anda:</p>
              <div style="display:flex;flex-wrap:wrap;gap:8px">
                ${qrBlocks.join("")}
              </div>
              <p style="margin:12px 0 0;font-size:12px;color:#888">Screenshot email ini atau tunjukkan langsung di pintu masuk.</p>
            </div>
            <p style="font-size:12px;color:#aaa">LPKBB Antareja 2026 — SMK Telkom Malang</p>
          </div>
        `,
      });
    } catch (e) {
      console.error("Gagal kirim email tiket:", e);
    }

    revalidatePath("/admin/tiket");
    revalidatePath("/admin/tiket/pos");
    revalidatePath("/admin/kas");
    return { success: true };
  } catch {
    return { success: false };
  }
}

// Unduh kuitansi PDF tiket online terverifikasi (admin/bendahara) — nomor sama tiap unduh.
export async function unduhKuitansiTiket(transaksiId: string) {
  await requireAdmin();
  try {
    const k = await buatKuitansiTiket(transaksiId);
    if (!k) return { success: false, message: "Kuitansi hanya untuk tiket online yang sudah diverifikasi" };
    return { success: true, base64: k.pdf.toString("base64"), filename: k.filename };
  } catch (e) {
    console.error("unduhKuitansiTiket error:", e);
    return { success: false, message: "Gagal membuat kuitansi" };
  }
}

export async function rejectTiket(transaksiId: string) {
  await requireAdmin();
  try {
    const transaksi = await findTransaksiTiket({ id: transaksiId });
    // Hanya yang masih PENDING — menolak transaksi yang sudah VERIFIED akan
    // meninggalkan entri kas/suara/QR yang sudah tercatat.
    const tolak = await prisma.transaksiTiket.updateMany({ where: { id: transaksiId, status: "PENDING" }, data: { status: "REJECTED" } });
    if (tolak.count === 0) return { success: false, message: "Transaksi sudah diproses sebelumnya" };
    if (transaksi) {
      await catatLog("TOLAK_TIKET", `Tiket ${transaksi.tiket.jenis} × ${transaksi.jumlah} (${transaksi.nama})`);
    }
    revalidatePath("/admin/tiket");
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ─── POS: Pengambilan Tiket Online ───────────────────────────────────────────

// Petugas loket menandai tiket online (sudah VERIFIED) sudah diambil pembeli.
// Klaim atomik (where diambilAt null) supaya dua petugas tidak menandai ganda.
export async function tandaiTiketDiambil(transaksiId: string) {
  await requireAdminOrTiket();
  const klaim = await prisma.transaksiTiket.updateMany({
    where: { id: transaksiId, status: "VERIFIED", jenisJual: "ONLINE", diambilAt: null },
    data: { diambilAt: new Date() },
  });
  if (klaim.count === 0) return { success: false, message: "Tiket sudah ditandai diambil atau belum terverifikasi" };
  const tr = await prisma.transaksiTiket.findUnique({ where: { id: transaksiId }, include: { tiket: true } });
  await catatLog("TIKET_DIAMBIL", `${tr?.nama} — ${tr?.tiket.jenis} × ${tr?.jumlah}${tr?.kodeUnik ? ` [#${tr.kodeUnik}]` : ""}`);
  revalidatePath("/admin/tiket/pos");
  revalidatePath("/admin/tiket");
  return { success: true };
}

// Untuk koreksi salah tandai di loket.
export async function batalTiketDiambil(transaksiId: string) {
  await requireAdminOrTiket();
  const batal = await prisma.transaksiTiket.updateMany({
    where: { id: transaksiId, diambilAt: { not: null } },
    data: { diambilAt: null },
  });
  if (batal.count === 0) return { success: false, message: "Tiket belum ditandai diambil" };
  const tr = await prisma.transaksiTiket.findUnique({ where: { id: transaksiId }, select: { nama: true, kodeUnik: true } });
  await catatLog("BATAL_TIKET_DIAMBIL", `${tr?.nama}${tr?.kodeUnik ? ` [#${tr.kodeUnik}]` : ""}`);
  revalidatePath("/admin/tiket/pos");
  revalidatePath("/admin/tiket");
  return { success: true };
}

// Rekap pintu masuk untuk halaman scanner: QR tiket terverifikasi yang sudah
// masuk vs total.
export async function statistikScanTiket() {
  await requireAdmin();
  const [masuk, total] = await Promise.all([
    prisma.qRTiket.count({ where: { statusScan: true } }),
    prisma.qRTiket.count({ where: { transaksi: { status: "VERIFIED" } } }),
  ]);
  return { masuk, total };
}

export async function scanQRTiket(input: string) {
  await requireAdmin();
  try {
    // Input manual boleh kode pendek ("00A8-A3F2") — cari token yang awalannya sama.
    let token = input.trim();
    const awalan = awalanDariKodePendek(token);
    if (awalan) {
      const cocok = await prisma.qRTiket.findMany({ where: { token: { startsWith: awalan } }, select: { token: true }, take: 2 });
      if (cocok.length === 0) return { success: false, message: "Kode tiket tidak ditemukan" };
      if (cocok.length > 1) return { success: false, message: "Kode tiket ganda — scan QR atau ketik token lengkap" };
      token = cocok[0].token;
    }
    const qr = await prisma.qRTiket.findUnique({
      where: { token },
      include: { transaksi: { include: { tiket: true } } },
    });

    if (!qr) return { success: false, message: "QR tidak valid — bukan tiket Antareja" };
    if (qr.transaksi.status !== "VERIFIED")
      return { success: false, message: "Tiket belum diverifikasi panitia" };
    const sudahScan = (waktu: Date | null) => ({
      success: false,
      message: `Tiket sudah pernah di-scan${waktu ? ` pukul ${formatJamWib(waktu)} WIB` : ""}`,
      nama: qr.transaksi.nama,
    });
    if (qr.statusScan) return sudahScan(qr.waktuScan);

    // Klaim atomik: dua petugas scan QR yang sama bersamaan → hanya satu yang
    // berhasil (cek-lalu-update biasa bisa meloloskan keduanya).
    const waktuScan = new Date();
    const klaim = await prisma.qRTiket.updateMany({
      where: { token, statusScan: false },
      data: { statusScan: true, waktuScan },
    });
    if (klaim.count === 0) {
      const terbaru = await prisma.qRTiket.findUnique({ where: { token }, select: { waktuScan: true } });
      return sudahScan(terbaru?.waktuScan ?? null);
    }

    return {
      success: true,
      data: {
        nama: qr.transaksi.nama,
        jenis: qr.transaksi.tiket.jenis,
        bundle: qr.bundle ? qr.transaksi.bundleIsi ?? "Bundling" : null,
        waktuScan: waktuScan.toISOString(),
      },
    };
  } catch {
    return { success: false, message: "Terjadi kesalahan" };
  }
}
