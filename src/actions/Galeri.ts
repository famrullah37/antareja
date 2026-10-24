"use server";
import { batasiAksi } from "@/lib/rateLimit";

import { getServerSession } from "@/lib/next-auth";
import { cekDataPemesan } from "@/lib/validasi";
import { revalidatePath } from "next/cache";
import {
  createAlbum,
  createFoto,
  createTransaksiFoto,
  deleteAlbum,
  deleteFoto,
  updateAlbum,
  updateTransaksiFoto,
} from "@/queries/galeri.query";
import { incrementCounterUrutFoto } from "@/queries/tiket.query";
import { catatLog } from "@/lib/activityLog";
import { imageUploader, validateUploadFile } from "./fileUploader";
import { addWatermark } from "@/lib/watermark";
import { sendMailTo } from "@/lib/mailer";
import prisma from "@/lib/prisma";
import { toDownloadUrl } from "@/lib/downloadUrl";
import { escapeHtml } from "@/lib/escapeHtml";
import { buatKuitansiFoto } from "@/lib/kuitansiPenjualan";
import { blokRingkasanPembayaran, kirimEmailPesananDiterima, notifPembayaranMasuk, type RingkasanPembayaran } from "@/lib/emailPembayaran";

// Ringkasan nominal pembelian foto untuk email. TransaksiFoto.harga sudah
// termasuk kode unik (lihat beliFoto); harga album bisa berubah setelah beli,
// jadi rincian memakai total tersimpan dikurangi kode unik.
function ringkasanFoto(t: {
  harga: number;
  kodeUnik: string | null;
  fotoList: unknown;
  metodePembayaran: string;
  createdAt: Date;
}): RingkasanPembayaran {
  const kode = t.kodeUnik ? parseInt(t.kodeUnik, 10) : 0;
  const jumlahFoto = Array.isArray(t.fotoList) ? t.fotoList.length : 0;
  return {
    kodeUnik: t.kodeUnik,
    totalBayar: t.harga,
    metodePembayaran: t.metodePembayaran,
    tanggal: t.createdAt,
    rincian: [{ label: `Foto Premium (${jumlahFoto} foto)`, nominal: t.harga - kode }],
  };
}

async function requireAdmin() {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN") throw new Error("Forbidden");
}

// Verifikasi pembelian foto = urusan keuangan, sama seperti Tiket/Voting/Merch.
async function requireAdminOrBendahara() {
  const session = await getServerSession();
  if (!["ADMIN", "BENDAHARA"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
}

async function requireAdminOrFotografer() {
  const session = await getServerSession();
  if (!["ADMIN", "FOTOGRAFER"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
}

// ─── Admin: Album ─────────────────────────────────────────────────────────────

export async function createAlbumAdmin(data: FormData) {
  await requireAdminOrFotografer();
  const nama = data.get("nama") as string;
  const deskripsi = data.get("deskripsi") as string;
  const tipe = (data.get("tipe") as string) || "BERBAYAR";
  const harga = parseInt((data.get("harga") as string) || "0");
  try {
    await createAlbum({ nama, deskripsi, tipe, harga });
    revalidatePath("/admin/galeri");
    return { success: true };
  } catch { return { success: false }; }
}

export async function publishAlbum(albumId: string, publish: boolean) {
  await requireAdminOrFotografer();
  try {
    await updateAlbum({ id: albumId }, { statusPublish: publish });
    revalidatePath("/admin/galeri");
    revalidatePath("/galeri");
    return { success: true };
  } catch { return { success: false }; }
}

export async function deleteAlbumAdmin(albumId: string) {
  await requireAdminOrFotografer();
  try {
    await deleteAlbum({ id: albumId });
    revalidatePath("/admin/galeri");
    revalidatePath("/galeri");
    return { success: true };
  } catch (e) {
    console.error("deleteAlbumAdmin error:", e);
    return { success: false };
  }
}

// ─── Fotografer/Admin: Upload Foto ───────────────────────────────────────────

export async function uploadFoto(data: FormData) {
  await requireAdminOrFotografer();
  const albumId = data.get("albumId") as string;
  const tagTim = data.get("tagTim") as string;
  const files = data.getAll("fotos") as File[];

  const results = await Promise.allSettled(
    files.map(async (file) => {
      // maxMB 15: foto event dari kamera (bukan HP) umum 8-15MB — default 10MB
      // dulu bikin foto besar diam-diam gagal tanpa alasan jelas ke fotografer.
      const fileCheck = await validateUploadFile(file, { maxMB: 15 });
      if (!fileCheck.valid) throw new Error(fileCheck.message);
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await imageUploader(buffer);
      if (!uploaded.data?.url) throw new Error("Upload gagal");

      // Preview publik album berbayar pakai versi watermark ini (lihat
      // GaleriClient/GaleriSection: isGratis ? pathAsli : pathWatermark) —
      // kalau gagal digenerate, fallback ke foto asli daripada gagal total.
      const watermarkedBuffer = await addWatermark(buffer);
      const uploadedWatermark = await imageUploader(watermarkedBuffer);

      await createFoto({
        album: { connect: { id: albumId } },
        pathAsli: uploaded.data.url,
        pathWatermark: uploadedWatermark.data?.url ?? uploaded.data.url,
        tagTim: tagTim || undefined,
        statusPublish: true,
      });
    })
  );

  const failedReasons = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => (r.reason instanceof Error ? r.reason.message : "Upload gagal"));
  revalidatePath("/admin/galeri");
  revalidatePath("/galeri");
  return { success: true, uploaded: files.length - failedReasons.length, failed: failedReasons.length, failedReasons };
}

export async function deleteFotoAdmin(fotoId: string) {
  await requireAdminOrFotografer();
  try {
    await deleteFoto({ id: fotoId });
    revalidatePath("/admin/galeri");
    return { success: true };
  } catch { return { success: false }; }
}

// ─── User: Beli Foto ──────────────────────────────────────────────────────────

// Cadangkan kode unik 3 digit secara atomik (counter di KonfigTiket, sama
// pola dengan reserveKodeVoting/reserveKodePendaftaran/reserveKodeTiket) —
// dipanggil dari GaleriClient begitu checkout dibuka.
export async function reserveKodeFoto() {
  const dibatasi = await batasiAksi("kode", 120, 10 * 60 * 1000);
  if (dibatasi) return { success: false, message: dibatasi };
  try {
    const updated = await incrementCounterUrutFoto();
    const kodeUnik = String(updated.counterUrutFoto % 1000).padStart(3, "0");
    return { success: true, kodeUnik };
  } catch (e) {
    console.error("reserveKodeFoto error:", e);
    return { success: false };
  }
}

export async function beliFoto(data: FormData) {
  const dibatasi = await batasiAksi("beli", 40, 10 * 60 * 1000);
  if (dibatasi) return { success: false, message: dibatasi };
  // userId dari sesi, bukan dari klien — kalau dari klien, siapa pun bisa
  // menempelkan transaksinya ke akun orang lain.
  const userId = (await getServerSession())?.user?.id;
  const fotoListRaw = data.get("fotoList") as string;
  const bukti = data.get("bukti") as File | null;
  const email = (data.get("email") as string) || "";
  const namaPembeli = (data.get("namaPembeli") as string) || "";
  const metodePembayaran = (data.get("metodePembayaran") as string) || "TRANSFER";
  const kodeUnik = data.get("kodeUnik") as string | null;

  // Bukti wajib untuk transfer manual (admin tidak punya cara lain
  // memverifikasi) — untuk QRIS opsional karena nominal sudah unik lewat
  // kodeUnik, admin cocokkan manual dari riwayat QRIS/mutasi rekening.
  if (metodePembayaran !== "QRIS" && (!bukti || bukti.size === 0)) {
    return { success: false, message: "Bukti pembayaran wajib diunggah" };
  }
  if (!kodeUnik || !/^\d{3}$/.test(kodeUnik)) {
    return { success: false, message: "Kode pembayaran tidak valid, silakan ulangi checkout" };
  }
  const salahData = cekDataPemesan({ nama: namaPembeli, email }, { noHpWajib: false });
  if (salahData) return { success: false, message: salahData };

  try {
    const parsed: unknown = JSON.parse(fotoListRaw || "[]");
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 500 || !parsed.every((x) => typeof x === "string"))
      return { success: false, message: "Pilihan foto tidak valid" };
    const fotoList = Array.from(new Set(parsed as string[]));
    // Hanya foto yang ada & sudah dipublish (foto + album) yang boleh dibeli —
    // fotoList inilah yang nanti dibuka di halaman unduhan setelah verifikasi.
    const fotos = await prisma.foto.findMany({
      where: { id: { in: fotoList }, statusPublish: true, album: { statusPublish: true } },
      select: { albumId: true, album: { select: { harga: true } } },
    });
    if (fotos.length !== fotoList.length)
      return { success: false, message: "Ada foto yang tidak tersedia, muat ulang halaman" };
    const uniqueAlbumPrices = Array.from(new Map(fotos.map((f) => [f.albumId, f.album.harga])).values());
    // Nominal akhir = total harga album + kode unik — kalau tidak ditambahkan,
    // dua pembelian album yang sama tercatat dengan nominal identik di
    // laporan kas (lihat juga totalBayar di Voting.ts/registrationForm.ts).
    const harga = uniqueAlbumPrices.reduce((sum, h) => sum + h, 0) + parseInt(kodeUnik);
    const expiredAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Cegah dua transaksi memakai kodeUnik yang sama — nominal transfer harus
    // presisi unik supaya admin gampang cocokkan mutasi/QRIS.
    const dipakai = await prisma.transaksiFoto.findFirst({
      where: { kodeUnik, status: { in: ["PENDING", "VERIFIED"] } },
    });
    if (dipakai) return { success: false, message: "Kode unik sudah terpakai, silakan coba lagi" };

    let buktiUrl: string | undefined;
    if (bukti && bukti.size > 0) {
      const fileCheck = await validateUploadFile(bukti);
      if (!fileCheck.valid) return { success: false, message: fileCheck.message };
      const upload = await imageUploader(Buffer.from(await bukti.arrayBuffer()));
      if (!upload.data?.url) return { success: false, message: "Upload bukti gagal" };
      buktiUrl = upload.data.url;
    }

    const transaksi = await createTransaksiFoto({
      fotoList,
      harga,
      ...(buktiUrl ? { bukti: buktiUrl } : {}),
      status: "PENDING",
      expiredAt,
      kodeUnik,
      metodePembayaran,
      namaPembeli: namaPembeli || null,
      email: email || null,
      ...(userId ? { user: { connect: { id: userId } } } : {}),
    } as any);
    notifPembayaranMasuk({
      jenis: "Foto",
      pathAdmin: "/admin/galeri/transaksi",
      nama: namaPembeli || "Pembeli",
      kontak: email || null,
      totalBayar: harga,
      kodeUnik,
      metodePembayaran,
      buktiUrl,
      detail: `${fotoList.length} foto`,
    });
    if (email) {
      await kirimEmailPesananDiterima({
        to: email,
        nama: namaPembeli || "Pembeli",
        produk: "Foto",
        ringkasan: ringkasanFoto({ harga, kodeUnik, fotoList, metodePembayaran, createdAt: new Date() }),
        keterangan: "Link unduhan foto akan dikirim ke email ini setelah pembayaran diverifikasi panitia.",
      });
    }
    revalidatePath("/galeri");
    return { success: true, kodeUnik, transaksiId: (transaksi as any).id };
  } catch { return { success: false }; }
}

// ─── Admin: Verifikasi Pembelian Foto ─────────────────────────────────────────

export async function verifikasiFoto(transaksiId: string) {
  await requireAdminOrBendahara();
  try {
    const transaksi = await prisma.transaksiFoto.findUnique({ where: { id: transaksiId } });
    if (!transaksi) return { success: false };
    // Tanpa guard ini, klik "Verifikasi" dua kali (double-click, refresh, dst)
    // akan membuat entri kas baru tiap kali dipanggil padahal transaksinya
    // cuma satu — sama pola guard yang sudah ada di verifikasiTiket/Voting.
    if (transaksi.status === "VERIFIED") {
      return { success: false, message: "Foto sudah diverifikasi sebelumnya" };
    }
    // Klaim atomik: hanya satu request yang bisa mengubah status ke VERIFIED —
    // cek-lalu-update biasa lolos dua kali bila tombol terkirim ganda (kas dobel).
    const klaim = await prisma.transaksiFoto.updateMany({
      where: { id: transaksiId, status: "PENDING" },  // hanya PENDING: transaksi DITOLAK tidak bisa diverifikasi ulang (kode unik-nya mungkin sudah dipakai transaksi lain)
      data: { status: "VERIFIED" },
    });
    if (klaim.count === 0) return { success: false, message: "Transaksi foto sudah diproses (diverifikasi/ditolak) sebelumnya" };
    const t = transaksi as any;
    const kodeInfo = t.kodeUnik ? ` [#${t.kodeUnik}]` : "";
    const pembeliInfo = t.namaPembeli ? ` — ${t.namaPembeli}` : "";
    await catatLog("VERIFIKASI_FOTO", `Foto${pembeliInfo}${kodeInfo} — Rp${transaksi.harga}`);
    await prisma.kasTransaksi.create({
      data: { tipe: "PEMASUKAN", keterangan: `Foto${pembeliInfo}${kodeInfo}`, jumlah: transaksi.harga, kategori: "FOTO", sumber: "FOTO", referensiId: transaksiId },
    });
    const userEmail = t.email as string | null;
    const namaPembeli = (t.namaPembeli as string | null) ?? "Pembeli";
    if (userEmail) {
      try {
        const fotoIds = transaksi.fotoList as string[];
        const fotos = await prisma.foto.findMany({ where: { id: { in: fotoIds } }, select: { id: true, pathAsli: true, tagTim: true } });
        const baseUrl = (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");
        const downloadPageUrl = `${baseUrl}/galeri/download/${transaksiId}`;
        const fotoLinks = fotos.map((f, i) =>
          `<li style="margin-bottom:8px"><a href="${toDownloadUrl(f.pathAsli, f.tagTim ?? `Foto-${i + 1}`)}" download style="background:#F70048;color:#fff;padding:6px 14px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:13px;display:inline-block">⬇ Unduh Foto ${i + 1}${f.tagTim ? ` — ${f.tagTim}` : ""}</a></li>`
        ).join("");
        const kuitansi = await buatKuitansiFoto(transaksiId).catch((e) => {
          console.error("Gagal membuat kuitansi foto:", e);
          return null;
        });
        await sendMailTo({
          to: userEmail,
          ...(kuitansi
            ? { fileAttachments: [{ filename: kuitansi.filename, content: kuitansi.pdf, contentType: "application/pdf" }] }
            : {}),
          subject: `✅ Foto LPKBB Antareja 2026 — Siap Diunduh`,
          html: `<div style="font-family:sans-serif;max-width:520px;margin:auto"><h2 style="color:#F70048">Foto Anda Siap Diunduh!</h2><p>Halo <b>${escapeHtml(namaPembeli)}</b>,</p><p>Pembayaran Anda telah diverifikasi. Silakan unduh foto Anda:</p>${blokRingkasanPembayaran(ringkasanFoto({ harga: transaksi.harga, kodeUnik: t.kodeUnik ?? null, fotoList: transaksi.fotoList, metodePembayaran: t.metodePembayaran, createdAt: transaksi.createdAt }), "Lunas")}${kuitansi ? `<p>Kuitansi pembayaran terlampir (No. <b>${kuitansi.nomor}</b>).</p>` : ""}<div style="margin:16px 0"><a href="${downloadPageUrl}" style="background:#F70048;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">🔗 Buka Halaman Unduhan</a></div><ul style="padding-left:0;list-style:none">${fotoLinks}</ul><p style="font-size:12px;color:#aaa">LPKBB Antareja 2026 — SMK Telkom Malang</p></div>`,
        });
      } catch { /* email failure is non-fatal */ }
    }
    revalidatePath("/admin/galeri");
    revalidatePath("/admin/galeri/transaksi");
    revalidatePath("/admin/kas");
    return { success: true };
  } catch { return { success: false }; }
}

// Unduh kuitansi PDF pembelian foto terverifikasi — nomor sama tiap unduh.
export async function unduhKuitansiFoto(transaksiId: string) {
  await requireAdminOrBendahara();
  try {
    const k = await buatKuitansiFoto(transaksiId);
    if (!k) return { success: false, message: "Kuitansi hanya untuk pembelian yang sudah diverifikasi" };
    return { success: true, base64: k.pdf.toString("base64"), filename: k.filename };
  } catch (e) {
    console.error("unduhKuitansiFoto error:", e);
    return { success: false, message: "Gagal membuat kuitansi" };
  }
}

// ─── Watermark Foto Lama ─────────────────────────────────────────────────────

// Foto yang diupload sebelum watermark server-side ada (atau yang watermark-nya
// gagal saat upload) punya pathWatermark === pathAsli — preview publik album
// berbayar jadi sama dengan file aslinya. Diproses per batch kecil supaya satu
// klik tidak kena batas waktu request; tombol diklik ulang sampai sisa 0.
const BATCH_WATERMARK = 10;

export async function hitungFotoTanpaWatermark() {
  await requireAdminOrFotografer();
  const rows = await prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*)::bigint AS n FROM "Foto" WHERE "pathWatermark" = "pathAsli"`;
  return Number(rows[0]?.n ?? 0);
}

// no-store: fetch di server Next.js di-cache secara default, dan foto event
// besar (beberapa MB) tidak perlu/boleh masuk cache itu. Dicoba ulang sekali
// karena koneksi ke Cloudinary sesekali putus di tengah unduhan.
async function unduhFoto(url: string): Promise<Buffer> {
  let galat: unknown;
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`unduh foto gagal (HTTP ${res.status})`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      galat = e;
    }
  }
  throw galat instanceof Error ? new Error(`unduh foto gagal: ${galat.message}`) : new Error("unduh foto gagal");
}

export async function buatWatermarkFotoLama() {
  await requireAdminOrFotografer();
  const fotos = await prisma.$queryRaw<{ id: string; pathAsli: string }[]>`
    SELECT id, "pathAsli" FROM "Foto" WHERE "pathWatermark" = "pathAsli" ORDER BY "createdAt" LIMIT ${BATCH_WATERMARK}`;
  let berhasil = 0;
  const gagal: string[] = [];
  for (const f of fotos) {
    try {
      const asli = await unduhFoto(f.pathAsli);
      const wm = await addWatermark(asli);
      // addWatermark mengembalikan buffer asli kalau gagal — jangan dianggap berhasil.
      if (wm === asli) throw new Error("watermark gagal dibuat");
      const up = await imageUploader(wm);
      if (!up.data?.url) throw new Error(up.message || "upload gagal");
      await prisma.foto.update({ where: { id: f.id }, data: { pathWatermark: up.data.url } });
      berhasil++;
    } catch (e) {
      gagal.push(e instanceof Error ? e.message : "error");
    }
  }
  const sisa = await hitungFotoTanpaWatermark();
  if (berhasil > 0) {
    await catatLog("WATERMARK_FOTO_LAMA", `${berhasil} foto diproses, sisa ${sisa}`);
    revalidatePath("/admin/galeri");
    revalidatePath("/galeri");
  }
  return {
    success: gagal.length === 0,
    berhasil,
    sisa,
    message: gagal.length ? `${gagal.length} foto gagal: ${Array.from(new Set(gagal)).join("; ")}` : undefined,
  };
}

export async function rejectFoto(transaksiId: string) {
  await requireAdminOrBendahara();
  try {
    const transaksi = await prisma.transaksiFoto.findUnique({ where: { id: transaksiId } });
    // Hanya yang masih PENDING — menolak transaksi yang sudah VERIFIED akan
    // meninggalkan entri kas/suara/QR yang sudah tercatat.
    const tolak = await prisma.transaksiFoto.updateMany({ where: { id: transaksiId, status: "PENDING" }, data: { status: "REJECTED" } });
    if (tolak.count === 0) return { success: false, message: "Transaksi sudah diproses sebelumnya" };
    if (transaksi) {
      const pembeliInfo = transaksi.namaPembeli ? ` — ${transaksi.namaPembeli}` : "";
      await catatLog("TOLAK_FOTO", `Foto${pembeliInfo}`);
    }
    revalidatePath("/admin/galeri");
    revalidatePath("/admin/galeri/transaksi");
    return { success: true };
  } catch { return { success: false }; }
}
