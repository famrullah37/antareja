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
import { getKonfigUmum } from "@/queries/konfigUmum.query";
import { imageUploader, validateUploadFile } from "./fileUploader";
import { addWatermark } from "@/lib/watermark";
import { fotoGratis, MAKS_FOTO_PER_UPLOAD, type PemilikFoto } from "@/lib/galeri";
import { sendMailTo } from "@/lib/mailer";
import prisma from "@/lib/prisma";
import { toDownloadUrl } from "@/lib/downloadUrl";
import { escapeHtml } from "@/lib/escapeHtml";
import { buatKuitansiFoto } from "@/lib/kuitansiPenjualan";
import { blokRingkasanPembayaran, kirimEmailPesananDiterima, notifPembayaranMasuk, type RingkasanPembayaran } from "@/lib/emailPembayaran";
import { cekTokenKode, terbitkanTokenKode } from "@/lib/kodeUnikToken";

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
  return session!.user!;
}

async function requireAdminOnly() {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN") throw new Error("Forbidden");
}

// fotograferId harus akun ber-role FOTOGRAFER (atau kosong = belum ditentukan).
async function fotograferValid(id: string | null) {
  if (!id) return true;
  const u = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  return u?.role === "FOTOGRAFER";
}

// ─── Admin: Album ─────────────────────────────────────────────────────────────

export async function createAlbumAdmin(data: FormData) {
  const user = await requireAdminOrFotografer();
  const nama = data.get("nama") as string;
  const deskripsi = data.get("deskripsi") as string;
  const tipe = (data.get("tipe") as string) || "BERBAYAR";
  const harga = parseInt((data.get("harga") as string) || "0");
  if (!(nama ?? "").trim()) return { success: false, message: "Nama album wajib diisi" };
  if (tipe !== "BERBAYAR" && tipe !== "GRATIS") return { success: false, message: "Tipe album tidak valid" };
  if (!Number.isInteger(harga) || harga < 0 || harga > 10_000_000) return { success: false, message: "Harga tidak valid" };
  if (tipe === "BERBAYAR" && harga <= 0) return { success: false, message: "Album berbayar wajib punya harga per foto" };
  // Fotografer yang membuat album otomatis jadi pemiliknya; admin memilih.
  const fotograferId = user.role === "FOTOGRAFER" ? user.id : (data.get("fotograferId") as string) || null;
  if (!(await fotograferValid(fotograferId))) return { success: false };
  // Satu album = satu tim (opsional).
  const timId = ((data.get("timId") as string) || "").trim() || null;
  if (timId && !(await prisma.tim.count({ where: { id: timId } }))) return { success: false, message: "Tim tidak ditemukan" };
  try {
    await createAlbum({
      nama, deskripsi, tipe, harga, timId,
      ...(fotograferId ? { fotografer: { connect: { id: fotograferId } } } : {}),
    });
    revalidatePath("/admin/galeri");
    return { success: true };
  } catch { return { success: false }; }
}

export async function setFotograferAlbum(albumId: string, fotograferId: string | null) {
  await requireAdminOnly();
  if (!(await fotograferValid(fotograferId))) return { success: false, message: "Fotografer tidak valid" };
  try {
    const album = await prisma.album.update({ where: { id: albumId }, data: { fotograferId }, include: { fotografer: true } });
    await catatLog("UBAH_FOTOGRAFER_ALBUM", `${album.nama} → ${album.fotografer?.nama ?? "(kosong)"}`);
    revalidatePath("/admin/galeri");
    return { success: true };
  } catch {
    return { success: false, message: "Gagal mengubah fotografer album" };
  }
}

// Hubungkan album ke satu tim (null = album umum). Semua foto di album ikut
// pindah ke tim baru; foto yang tadinya ikut tim lama album dilepas.
// Admin, atau fotografer pemilik album.
export async function setTimAlbum(albumId: string, timId: string | null) {
  const user = await requireAdminOrFotografer();
  try {
    const album = await prisma.album.findUnique({ where: { id: albumId }, select: { nama: true, timId: true, fotograferId: true } });
    if (!album) return { success: false, message: "Album tidak ditemukan" };
    if (user.role === "FOTOGRAFER" && album.fotograferId !== user.id)
      return { success: false, message: "Hanya bisa mengubah album milik Anda" };
    const tim = timId ? await prisma.tim.findUnique({ where: { id: timId }, select: { id: true, nama_tim: true } }) : null;
    if (timId && !tim) return { success: false, message: "Tim tidak ditemukan" };

    await prisma.$transaction([
      prisma.album.update({ where: { id: albumId }, data: { timId: tim?.id ?? null } }),
      tim
        ? prisma.foto.updateMany({ where: { albumId }, data: { timId: tim.id, tagTim: tim.nama_tim } })
        : // tagTim ikut dikosongkan — kalau tidak, pencarian teks di galeri masih
          // menemukan foto ini lewat nama tim lama.
          prisma.foto.updateMany({ where: { albumId, timId: album.timId ?? "-" }, data: { timId: null, tagTim: null } }),
    ]);
    await catatLog("UBAH_TIM_ALBUM", `${album.nama} → ${tim?.nama_tim ?? "(album umum)"}`);
    revalidatePath("/admin/galeri");
    revalidatePath("/galeri");
    return { success: true };
  } catch {
    return { success: false, message: "Gagal mengubah tim album" };
  }
}

// Persentase bagian fotografer dari harga jual foto (tanpa kode unik).
// Hanya berlaku untuk transaksi yang diverifikasi setelah diubah — yang sudah
// terverifikasi memakai snapshot persentase saat itu.
export async function setPersenFotografer(persen: number) {
  await requireAdminOnly();
  if (!Number.isInteger(persen) || persen < 0 || persen > 100)
    return { success: false, message: "Persentase harus bilangan bulat 0–100" };
  try {
    await getKonfigUmum();
    await prisma.konfigUmum.update({ where: { id: "singleton" }, data: { persenFotografer: persen } });
    await catatLog("UBAH_BAGI_HASIL_FOTO", `Fotografer ${persen}% / Panitia ${100 - persen}%`);
    revalidatePath("/admin/galeri/bagi-hasil");
    return { success: true };
  } catch {
    return { success: false, message: "Gagal menyimpan persentase" };
  }
}

export async function setBiayaAdminPenarikan(biaya: number) {
  await requireAdminOnly();
  if (!Number.isInteger(biaya) || biaya < 0 || biaya > 100000)
    return { success: false, message: "Biaya admin harus bilangan bulat 0–100.000" };
  try {
    await getKonfigUmum();
    await prisma.konfigUmum.update({ where: { id: "singleton" }, data: { biayaAdminPenarikan: biaya } });
    await catatLog("UBAH_BIAYA_PENARIKAN_FOTO", `Biaya admin transfer Rp${biaya.toLocaleString("id-ID")}`);
    revalidatePath("/admin/galeri/bagi-hasil");
    revalidatePath("/admin/galeri/pendapatan");
    return { success: true };
  } catch {
    return { success: false, message: "Gagal menyimpan biaya admin" };
  }
}

// Admin, atau fotografer pemilik album (dulu fotografer mana pun bisa
// menyembunyikan/mempublish album fotografer lain).
export async function publishAlbum(albumId: string, publish: boolean) {
  const user = await requireAdminOrFotografer();
  try {
    if (user.role !== "ADMIN") {
      const album = await prisma.album.findUnique({ where: { id: albumId }, select: { fotograferId: true } });
      if (album?.fotograferId !== user.id) return { success: false, message: "Hanya bisa mengubah album milik Anda" };
    }
    await updateAlbum({ id: albumId }, { statusPublish: publish });
    revalidatePath("/admin/galeri");
    revalidatePath("/galeri");
    return { success: true };
  } catch { return { success: false }; }
}

// Hapus album = hapus semua fotonya. Dijaga ketat:
// - fotografer hanya album miliknya, dan hanya kalau semua foto di dalamnya
//   juga miliknya (foto fotografer lain tidak ikut terhapus diam-diam);
// - siapa pun (termasuk admin) tidak bisa menghapus album yang punya foto
//   sudah dibeli / sedang dipesan — halaman unduhan pembeli butuh fotonya.
export async function deleteAlbumAdmin(albumId: string) {
  const user = await requireAdminOrFotografer();
  try {
    const album = await prisma.album.findUnique({
      where: { id: albumId },
      select: { fotograferId: true, fotos: { select: { id: true, fotograferId: true } } },
    });
    if (!album) return { success: false, message: "Album tidak ditemukan" };

    if (user.role !== "ADMIN") {
      if (album.fotograferId !== user.id) return { success: false, message: "Anda hanya bisa menghapus album milik sendiri" };
      const fotoOrangLain = album.fotos.filter((f) => f.fotograferId && f.fotograferId !== user.id).length;
      if (fotoOrangLain > 0)
        return { success: false, message: `Album berisi ${fotoOrangLain} foto fotografer lain — hubungi admin` };
    }

    const ids = album.fotos.map((f) => f.id);
    if (ids.length > 0) {
      const transaksi = await prisma.transaksiFoto.findMany({
        where: { status: { in: ["PENDING", "VERIFIED"] } },
        select: { fotoList: true },
      });
      const terpakai = new Set(transaksi.flatMap((t) => (Array.isArray(t.fotoList) ? (t.fotoList as string[]) : [])));
      const terjual = ids.filter((id) => terpakai.has(id)).length;
      if (terjual > 0)
        return {
          success: false,
          message: `${terjual} foto di album ini sudah dibeli/dipesan, jadi album tidak bisa dihapus. Sembunyikan album saja, atau hapus foto yang belum terjual satu per satu.`,
        };
    }

    await deleteAlbum({ id: albumId });
    await catatLog("HAPUS_ALBUM", `${albumId} (${ids.length} foto)`);
    revalidatePath("/admin/galeri");
    revalidatePath("/galeri");
    return { success: true };
  } catch (e) {
    console.error("deleteAlbumAdmin error:", e);
    return { success: false, message: "Gagal menghapus album" };
  }
}

// ─── Fotografer/Admin: Upload Foto ───────────────────────────────────────────

export async function uploadFoto(data: FormData) {
  const user = await requireAdminOrFotografer();
  const albumId = data.get("albumId") as string;
  const files = (data.getAll("fotos") as File[]).filter((f) => f && f.size > 0);
  if (files.length === 0) return { success: false, uploaded: 0, failed: 0, failedReasons: ["Pilih minimal 1 foto"] };
  if (files.length > MAKS_FOTO_PER_UPLOAD)
    return { success: false, uploaded: 0, failed: files.length, failedReasons: [`Maksimal ${MAKS_FOTO_PER_UPLOAD} foto per upload`] };
  // Tim dipilih dari daftar tim terdaftar (bukan diketik) supaya foto pasti
  // terhubung ke tim yang benar; tagTim diisi nama tim sebagai teks tampilan.
  // Album yang sudah terhubung ke tim menang: semua fotonya milik tim album.
  const albumTim = await prisma.album.findUnique({ where: { id: albumId }, select: { timId: true } });
  const timIdInput = albumTim?.timId || ((data.get("timId") as string) || "").trim();
  const tim = timIdInput
    ? await prisma.tim.findUnique({ where: { id: timIdInput }, select: { id: true, nama_tim: true } })
    : null;
  if (timIdInput && !tim) return { success: false, uploaded: 0, failed: files.length, failedReasons: ["Tim tidak ditemukan"] };
  const tagTim = tim?.nama_tim;
  // Tandai foto gratis (hanya berarti di album berbayar).
  const gratis = data.get("gratis") === "on";
  // Fotografer yang upload otomatis jadi pemilik fotonya (bagi hasil per foto);
  // admin boleh memilih — kosong = ikut fotografer album.
  const fotograferId = user.role === "FOTOGRAFER" ? user.id : (data.get("fotograferId") as string) || null;
  if (!(await fotograferValid(fotograferId))) return { success: false, uploaded: 0, failed: files.length, failedReasons: ["Fotografer tidak valid"] };

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
        timId: tim?.id,
        statusPublish: true,
        gratis,
        ...(fotograferId ? { fotografer: { connect: { id: fotograferId } } } : {}),
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

// Fotografer hanya boleh menghapus fotonya sendiri (fotograferId = dia, atau
// foto tanpa fotografer di album miliknya); admin boleh semua.
// Hapus banyak foto sekaligus (mode centang di Foto Ter-upload). Aturan sama
// dengan hapus satuan: fotografer hanya fotonya sendiri, foto yang sudah
// dibeli / sedang dipesan dilewati. Mengembalikan ringkasan.
export async function deleteFotoMassal(fotoIds: string[]) {
  const user = await requireAdminOrFotografer();
  if (!Array.isArray(fotoIds) || fotoIds.length === 0) return { success: false, message: "Belum ada foto dipilih" };
  if (fotoIds.length > 500) return { success: false, message: "Maksimal 500 foto sekali hapus" };
  const ids = Array.from(new Set(fotoIds.filter((x) => typeof x === "string")));
  try {
    const fotos = await prisma.foto.findMany({
      where: { id: { in: ids } },
      select: { id: true, fotograferId: true, album: { select: { fotograferId: true } } },
    });
    const milik = user.role === "ADMIN" ? fotos : fotos.filter((f) => (f.fotograferId ?? f.album.fotograferId) === user.id);
    const bukanMilik = fotos.length - milik.length;

    const transaksi = await prisma.transaksiFoto.findMany({
      where: { status: { in: ["PENDING", "VERIFIED"] } },
      select: { fotoList: true },
    });
    const terpakai = new Set(transaksi.flatMap((t) => (Array.isArray(t.fotoList) ? (t.fotoList as string[]) : [])));
    const bolehHapus = milik.filter((f) => !terpakai.has(f.id)).map((f) => f.id);
    const terjual = milik.length - bolehHapus.length;

    if (bolehHapus.length > 0) {
      await prisma.foto.deleteMany({ where: { id: { in: bolehHapus } } });
      await catatLog("HAPUS_FOTO_MASSAL", `${bolehHapus.length} foto`);
      revalidatePath("/admin/galeri");
      revalidatePath("/admin/galeri/foto");
      revalidatePath("/galeri");
    }
    return { success: true, dihapus: bolehHapus.length, dilewatiTerjual: terjual, dilewatiBukanMilik: bukanMilik };
  } catch (e) {
    console.error("deleteFotoMassal error:", e);
    return { success: false, message: "Gagal menghapus foto" };
  }
}

export async function deleteFotoAdmin(fotoId: string) {
  const user = await requireAdminOrFotografer();
  try {
    if (user.role !== "ADMIN") {
      const foto = await prisma.foto.findUnique({
        where: { id: fotoId },
        select: { fotograferId: true, album: { select: { fotograferId: true } } },
      });
      const pemilik = foto?.fotograferId ?? foto?.album.fotograferId;
      if (!foto || pemilik !== user.id) return { success: false, message: "Anda hanya bisa menghapus foto milik sendiri" };
    }
    // Foto yang sudah dibeli / sedang dalam pesanan tidak boleh dihapus —
    // halaman unduhan pembeli mengambil foto dari tabel ini (lewat fotoList).
    const dipakai = await prisma.transaksiFoto.count({
      where: { status: { in: ["PENDING", "VERIFIED"] }, fotoList: { array_contains: [fotoId] } },
    });
    if (dipakai > 0)
      return { success: false, message: "Foto ini sudah dibeli atau sedang dipesan, jadi tidak bisa dihapus" };
    await deleteFoto({ id: fotoId });
    revalidatePath("/admin/galeri");
    revalidatePath("/admin/galeri/foto");
    revalidatePath("/galeri");
    return { success: true };
  } catch { return { success: false, message: "Gagal menghapus foto" }; }
}

// Ubah foto jadi gratis / berbayar (di album berbayar). Admin, atau fotografer
// pemilik foto. Foto yang sedang dipesan (PENDING) tidak bisa dijadikan gratis
// supaya nominal pesanan tetap sesuai.
export async function setGratisFoto(fotoId: string, gratis: boolean) {
  const user = await requireAdminOrFotografer();
  try {
    const foto = await prisma.foto.findUnique({
      where: { id: fotoId },
      select: { fotograferId: true, album: { select: { fotograferId: true, tipe: true } } },
    });
    if (!foto) return { success: false, message: "Foto tidak ditemukan" };
    if (user.role !== "ADMIN" && (foto.fotograferId ?? foto.album.fotograferId) !== user.id)
      return { success: false, message: "Anda hanya bisa mengubah foto milik sendiri" };
    if (foto.album.tipe === "GRATIS") return { success: false, message: "Album ini sudah gratis seluruhnya" };
    if (gratis) {
      const dipesan = await prisma.transaksiFoto.count({
        where: { status: "PENDING", fotoList: { array_contains: [fotoId] } },
      });
      if (dipesan > 0) return { success: false, message: "Foto ini sedang dalam pesanan yang belum diverifikasi" };
    }
    await prisma.foto.update({ where: { id: fotoId }, data: { gratis } });
    revalidatePath("/admin/galeri/foto");
    revalidatePath("/galeri");
    return { success: true };
  } catch {
    return { success: false, message: "Gagal mengubah foto" };
  }
}

// ─── User: Beli Foto ──────────────────────────────────────────────────────────

// Cadangkan kode unik 3 digit secara atomik (counter di KonfigTiket, sama
// pola dengan reserveKodeVoting/reserveKodePendaftaran/reserveKodeTiket) —
// dipanggil dari GaleriClient begitu checkout dibuka.
// Kode unik foto berputar di KODE_FOTO_MIN..MAX (500–699, tidak bentrok dengan kode vote 0–499) dari counter
// berurutan; kode yang masih dipakai transaksi PENDING dilewati supaya nominal
// transfer yang sedang menunggu verifikasi tidak kembar (pola sama dengan vote).
const KODE_FOTO_MIN = 500;
const KODE_FOTO_MAX = 699;
const RENTANG_KODE_FOTO = KODE_FOTO_MAX - KODE_FOTO_MIN + 1;

export async function reserveKodeFoto() {
  const dibatasi = await batasiAksi("kode", 120, 10 * 60 * 1000);
  if (dibatasi) return { success: false, message: dibatasi };
  try {
    let kodeUnik: string | null = null;
    for (let i = 0; i < RENTANG_KODE_FOTO && !kodeUnik; i++) {
      const updated = await incrementCounterUrutFoto();
      const calon = String(KODE_FOTO_MIN + ((updated.counterUrutFoto - 1) % RENTANG_KODE_FOTO));
      const dipakai = await prisma.transaksiFoto.findFirst({
        where: { kodeUnik: calon, status: "PENDING" },
        select: { id: true },
      });
      if (!dipakai) kodeUnik = calon;
    }
    if (!kodeUnik)
      return { success: false, message: "Antrean pembayaran sedang penuh, coba lagi beberapa menit lagi" };
    return { success: true, kodeUnik, ...terbitkanTokenKode(kodeUnik) };
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
  if (
    !kodeUnik ||
    !/^\d{3}$/.test(kodeUnik) ||
    parseInt(kodeUnik) < KODE_FOTO_MIN ||
    parseInt(kodeUnik) > KODE_FOTO_MAX
  ) {
    return { success: false, message: "Kode pembayaran tidak valid, silakan ulangi checkout" };
  }
  if (metodePembayaran === "QRIS") {
    const salahKode = cekTokenKode(data.get("kodeToken"), kodeUnik);
    if (salahKode) return { success: false, message: salahKode };
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
      select: {
        id: true,
        albumId: true,
        gratis: true,
        fotograferId: true,
        fotografer: { select: { nama: true } },
        album: { select: { nama: true, harga: true, tipe: true, fotograferId: true, fotografer: { select: { nama: true } } } },
      },
    });
    if (fotos.length !== fotoList.length)
      return { success: false, message: "Ada foto yang tidak tersedia, muat ulang halaman" };
    // Foto gratis tidak dijual — bisa diunduh langsung dari galeri.
    if (fotos.some((f) => fotoGratis(f)))
      return { success: false, message: "Ada foto gratis di keranjang — foto gratis bisa diunduh langsung, hapus dari keranjang" };
    // Harga per foto: tiap foto dikenai harga albumnya. Snapshot per album
    // (harga = harga satuan × jumlah foto) untuk kuitansi & bagi hasil fotografer
    // (lib/bagiHasilFoto.ts) — tidak ikut berubah kalau harga album diubah nanti.
    const perAlbum = new Map<string, { albumId: string; nama: string; hargaSatuan: number; jumlahFoto: number; harga: number }>();
    for (const f of fotos) {
      const r = perAlbum.get(f.albumId) ?? { albumId: f.albumId, nama: f.album.nama, hargaSatuan: f.album.harga, jumlahFoto: 0, harga: 0 };
      r.jumlahFoto += 1;
      r.harga += f.album.harga;
      perAlbum.set(f.albumId, r);
    }
    const rincianAlbum = Array.from(perAlbum.values());
    // Pemilik efektif tiap foto saat beli (foto → fotografer foto, kosong →
    // fotografer album). Cadangan bagi hasil bila foto/album/akun terhapus.
    const pemilikFoto: PemilikFoto[] = fotos.map((f) => ({
      fotoId: f.id,
      albumId: f.albumId,
      fotograferId: f.fotograferId ?? f.album.fotograferId ?? null,
      fotograferNama: f.fotograferId ? f.fotografer?.nama ?? null : f.album.fotografer?.nama ?? null,
    }));
    // Nominal akhir = total harga foto + kode unik — kalau tidak ditambahkan,
    // dua pembelian yang sama tercatat dengan nominal identik di laporan kas
    // (lihat juga totalBayar di Voting.ts/registrationForm.ts).
    const harga = rincianAlbum.reduce((sum, r) => sum + r.harga, 0) + parseInt(kodeUnik);
    const expiredAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Cegah dua transaksi PENDING memakai kodeUnik yang sama — nominal transfer
    // harus presisi unik selama menunggu dicocokkan. Yang sudah VERIFIED tidak
    // dihitung: rentang kode cuma 200, kalau ikut dihitung kode cepat habis.
    const dipakai = await prisma.transaksiFoto.findFirst({
      where: { kodeUnik, status: "PENDING" },
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
      rincianAlbum,
      pemilikFoto,
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
      data: { status: "VERIFIED", persenFotografer: (await getKonfigUmum()).persenFotografer },
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
