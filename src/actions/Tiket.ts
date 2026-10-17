"use server";
import { batasiAksi } from "@/lib/rateLimit";

import { cekDataPemesan } from "@/lib/validasi";
import { getServerSession } from "@/lib/next-auth";
import { revalidatePath } from "next/cache";
import { sendMailTo } from "@/lib/mailer";
import QRCode from "qrcode";
import { buildDynamicQrisImage, decodeQrisFromImage } from "@/lib/qris";
import { catatLog } from "@/lib/activityLog";
import { labelBundling, punyaBundling, totalBayarTiket } from "@/lib/tiket";

// Pengaturan tiket (master, harga, bundling, rekening/QRIS): ADMIN & BENDAHARA.
async function requireAdmin() {
  const session = await getServerSession();
  if (!["ADMIN", "BENDAHARA"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
}

// Operasional (jual offline/POS, verifikasi, scan): ditambah petugas TIKET.
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
import { imageUploader, validateUploadFile } from "./fileUploader";
import prisma from "@/lib/prisma";
import { escapeHtml } from "@/lib/escapeHtml";
import { formatJamWib } from "@/lib/ujiCoba";
import { blokRingkasanPembayaran, kirimEmailPesananDiterima, type RingkasanPembayaran } from "@/lib/emailPembayaran";

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
      { label: `Tiket ${tr.tiket.jenis} × ${tr.jumlah}`, nominal: tr.tiket.harga * tr.jumlah },
      ...(tr.bundleJumlah > 0
        ? [{ label: `Bundling ${tr.bundleIsi ?? ""} × ${tr.bundleJumlah}`.trim(), nominal: tr.bundleHarga * tr.bundleJumlah }]
        : []),
    ],
  };
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
  try {
    await createTiket({ jenis, harga, kuota, sisa: kuota, ...parseBundling(data) });
    revalidatePath("/admin/tiket");
    return { success: true };
  } catch { return { success: false }; }
}

export async function updateTiketAdmin(data: FormData, id: string) {
  await requireAdmin();
  const jenis = data.get("jenis") as string;
  const harga = parseInt(data.get("harga") as string);
  const kuota = parseInt(data.get("kuota") as string);
  try {
    await updateTiket({ id }, { jenis, harga, kuota, ...parseBundling(data) });
    revalidatePath("/admin/tiket");
    return { success: true };
  } catch { return { success: false }; }
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
    return { success: true, kodeUnik };
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

  // Bukti wajib untuk transfer manual (admin tidak punya cara lain
  // memverifikasi) — untuk QRIS opsional karena nominal sudah unik lewat
  // kodeUnik, admin cocokkan manual dari riwayat QRIS/mutasi rekening.
  if (metodePembayaran !== "QRIS" && (!bukti || bukti.size === 0)) {
    return { success: false, message: "Bukti pembayaran wajib diunggah" };
  }
  if (!kodeUnik || !/^\d{3}$/.test(kodeUnik)) {
    return { success: false, message: "Kode pembayaran tidak valid, silakan pilih ulang jumlah tiket" };
  }

  // Cek tiket & stok SEBELUM upload — jangan buang kuota Cloudinary untuk pembelian
  // yang pasti gagal (stok tetap dicek ulang secara atomik di transaksi bawah).
  const tiketCek = await prisma.tiket.findUnique({ where: { id: tiketId }, select: { sisa: true } });
  if (!tiketCek) return { success: false, message: "Tiket tidak ditemukan" };
  if (tiketCek.sisa < jumlah) return { success: false, message: "Stok tiket tidak mencukupi" };

  // Upload bukti dulu sebelum transaksi DB
  let buktiUrl: string | undefined;
  if (bukti && bukti.size > 0) {
    const fileCheck = await validateUploadFile(bukti);
    if (!fileCheck.valid) return { success: false, message: fileCheck.message };
    const upload = await imageUploader(Buffer.from(await bukti.arrayBuffer()));
    if (upload.error) {
      console.error("Upload bukti gagal:", upload.message);
      return { success: false, message: upload.message };
    }
    buktiUrl = upload.data?.url;
  }

  try {
    // Atomic: decrement sisa hanya jika cukup, lalu buat transaksi
    const dibuat = await prisma.$transaction(async (tx) => {
      const tiket = await tx.tiket.findUnique({ where: { id: tiketId } });
      if (!tiket) throw new Error("TIKET_TIDAK_DITEMUKAN");
      if (jumlah < 1) throw new Error("JUMLAH_INVALID");
      if (tiket.sisa < jumlah) throw new Error("STOK_KURANG");
      if (!Number.isInteger(bundleJumlah) || bundleJumlah < 0 || bundleJumlah > jumlah)
        throw new Error("BUNDLE_INVALID");
      if (bundleJumlah > 0 && !punyaBundling(tiket)) throw new Error("BUNDLE_INVALID");

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
    await kirimEmailPesananDiterima({
      to: dibuat.email,
      nama: dibuat.nama,
      produk: "Tiket",
      ringkasan: ringkasanTiket(dibuat),
      keterangan: "QR code tiket akan dikirim ke email ini setelah pembayaran diverifikasi panitia.",
    });
    revalidatePath("/tiket");
    return { success: true };
  } catch (e: any) {
    const msg = e?.message ?? "";
    if (msg === "TIKET_TIDAK_DITEMUKAN") return { success: false, message: "Tiket tidak ditemukan" };
    if (msg === "JUMLAH_INVALID") return { success: false, message: "Jumlah tiket tidak valid" };
    if (msg === "STOK_KURANG") return { success: false, message: "Stok tiket tidak mencukupi" };
    if (msg === "BUNDLE_INVALID") return { success: false, message: "Jumlah paket bundling tidak valid (maksimal 1 per tiket)" };
    if (msg === "KODE_UNIK_DIPAKAI") return { success: false, message: "Kode unik sudah terpakai, silakan coba lagi" };
    console.error("beliTiket error:", e);
    return { success: false };
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
    revalidatePath("/admin/kas");
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ─── Admin: Verifikasi & QR ───────────────────────────────────────────────────

export async function verifikasiTiket(transaksiId: string) {
  await requireAdminOrTiket();
  try {
    const transaksi = await findTransaksiTiket({ id: transaksiId });
    if (!transaksi) return { success: false };
    if (transaksi.status === "VERIFIED") return { success: false, message: "Tiket sudah diverifikasi sebelumnya" };

    // Klaim atomik: hanya satu request yang bisa mengubah status ke VERIFIED —
    // cek-lalu-update biasa lolos dua kali bila tombol terkirim ganda (kas dobel).
    const klaim = await prisma.transaksiTiket.updateMany({
      where: { id: transaksiId, status: "PENDING" },  // hanya PENDING: transaksi DITOLAK tidak bisa diverifikasi ulang (kode unik-nya mungkin sudah dipakai transaksi lain)
      data: { status: "VERIFIED" },
    });
    if (klaim.count === 0) return { success: false, message: "Tiket sudah diproses (diverifikasi/ditolak) sebelumnya" };

    await prisma.qRTiket.createMany({
      data: Array.from({ length: transaksi.jumlah }, (_, i) => ({
        transaksiId,
        bundle: i < transaksi.bundleJumlah,
      })),
    });

    await prisma.tiket.update({
      where: { id: transaksi.tiketId, sisa: { gte: transaksi.jumlah } },
      data: { sisa: { decrement: transaksi.jumlah } },
    });

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
    const qrBlocks = await Promise.all(
      qrTikets.map(async (q, i) => {
        const dataUrl = await QRCode.toDataURL(q.token, { width: 200, margin: 2 });
        return `
          <div style="display:inline-block;text-align:center;margin:8px">
            <div style="font-size:12px;font-weight:bold;margin-bottom:4px">Tiket #${i + 1}</div>
            ${q.bundle ? `<div style="font-size:11px;color:#b45309;margin-bottom:4px">+ ${transaksi.bundleIsi ?? "Bundling"}</div>` : ""}
            <img src="${dataUrl}" width="160" height="160" style="display:block;border-radius:8px;border:1px solid #e5e7eb" alt="QR Tiket ${i + 1}"/>
            <div style="font-size:10px;font-family:monospace;color:#888;margin-top:4px;max-width:160px;overflow:hidden;text-overflow:ellipsis">${q.token}</div>
          </div>`;
      })
    );

    // Kirim email
    try {
      await sendMailTo({
        to: transaksi.email,
        subject: `✅ Tiket LPKBB Antareja 2026 — ${transaksi.tiket.jenis}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto">
            <h2 style="color:#F70048">Tiket Anda Terverifikasi!</h2>
            <p>Halo <b>${escapeHtml(transaksi.nama)}</b>,</p>
            <p>Pembelian tiket <b>${escapeHtml(transaksi.tiket.jenis)}</b> (${transaksi.jumlah} tiket) telah diverifikasi.</p>
            ${blokRingkasanPembayaran(ringkasanTiket(transaksi), "Lunas")}
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
    revalidatePath("/admin/kas");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function rejectTiket(transaksiId: string) {
  await requireAdminOrTiket();
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

// Rekap pintu masuk untuk halaman scanner: QR tiket terverifikasi yang sudah
// masuk vs total.
export async function statistikScanTiket() {
  await requireAdminOrTiket();
  const [masuk, total] = await Promise.all([
    prisma.qRTiket.count({ where: { statusScan: true } }),
    prisma.qRTiket.count({ where: { transaksi: { status: "VERIFIED" } } }),
  ]);
  return { masuk, total };
}

export async function scanQRTiket(token: string) {
  await requireAdminOrTiket();
  try {
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
