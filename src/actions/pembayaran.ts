"use server";

import { updatePembayaran } from "@/queries/pembayaran.query";
import { updateTim } from "@/queries/tim.query";
import { getKonfigUmum } from "@/queries/konfigUmum.query";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/next-auth";
import { Jenjang } from "@prisma/client";
import { buildKuitansiPdf } from "@/lib/kuitansi";
import { imageUploader } from "./fileUploader";
import { sendMailTo } from "@/lib/mailer";

// Halaman /admin/pembayaran juga bisa diakses role BENDAHARA (lihat middleware),
// jadi aksi konfirmasinya harus mengizinkan BENDAHARA juga — bukan cuma ADMIN.
async function requireAdmin() {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "BENDAHARA")
    throw new Error("Forbidden");
}

// No. urut ditampilkan untuk peserta saat penjurian (bukan nama tim), diberikan
// per jenjang secara berurutan begitu tim dikonfirmasi pembayarannya. Admin tetap
// bisa mengubahnya manual lewat halaman detail tim jika perlu reorder.
async function assignNoUrutIfNeeded(timId: string) {
  const tim = await prisma.tim.findUnique({ where: { id: timId } });
  if (!tim || tim.noUrut !== null) return;
  const agg = await prisma.tim.aggregate({
    where: { jenjang: tim.jenjang },
    _max: { noUrut: true },
  });
  const next = (agg._max.noUrut ?? 0) + 1;
  await prisma.tim.update({ where: { id: timId }, data: { noUrut: next } });
}

// Biaya pendaftaran per jenjang & tipe pembayaran diambil dari KonfigUmum (bisa
// diubah admin lewat /admin/pengaturan) — jangan hardcode di sini, supaya kas
// selalu mencatat nominal yang sesungguhnya berlaku, termasuk untuk jenjang SD.
export async function biayaPendaftaran(jenjang: Jenjang, isDP: boolean) {
  const konfig = await getKonfigUmum();
  const table: Record<Jenjang, { full: number; dp: number }> = {
    SD: { full: konfig.biayaSD, dp: konfig.biayaSDDP },
    SMP: { full: konfig.biayaSMP, dp: konfig.biayaSMPDP },
    SMA: { full: konfig.biayaSMA, dp: konfig.biayaSMADP },
    PURNA: { full: konfig.biayaPurna, dp: konfig.biayaPurnaDP },
  };
  return isDP ? table[jenjang].dp : table[jenjang].full;
}

// Tim yang terdaftar sebelum fitur kode unik ada punya pembayaran.kodeUnik/
// totalBayar kosong — dulu ini bikin generateDanKirimKuitansi nyerah diam-diam
// (lihat riwayat: guard "tidak bisa generate otomatis"). Sekarang di-assign
// kode unik baru di sini pakai counter yang sama dengan pendaftaran normal,
// supaya tim lama tetap bisa dapat kuitansi lewat "Generate Ulang Kuitansi".
async function ensureKodeUnikDanTotal(timId: string, hargaDasar: number) {
  const pembayaran = await prisma.pembayaran.findUnique({ where: { tim_id: timId } });
  if (!pembayaran) return null;
  if (pembayaran.kodeUnik && pembayaran.totalBayar) {
    return { kodeUnik: pembayaran.kodeUnik, totalBayar: pembayaran.totalBayar };
  }

  for (let i = 0; i < 20; i++) {
    const updated = await prisma.konfigUmum.update({
      where: { id: "singleton" },
      data: { counterUrutPendaftaran: { increment: 1 } },
    });
    const kodeUnik = String(updated.counterUrutPendaftaran % 1000).padStart(3, "0");
    const dipakai = await prisma.pembayaran.findFirst({
      where: { kodeUnik, tim_id: { not: timId } },
    });
    if (dipakai) continue;
    const totalBayar = hargaDasar + parseInt(kodeUnik);
    await prisma.pembayaran.update({ where: { tim_id: timId }, data: { kodeUnik, totalBayar } });
    return { kodeUnik, totalBayar };
  }
  return null;
}

// Generate kuitansi PDF, upload ke Cloudinary, simpan link-nya (menimpa yang
// lama kalau ada), dan kirim ke email pendaftar. SELALU generate ulang —
// pemanggil yang menentukan kapan ini boleh dipanggil (lihat
// kirimKuitansiJikaBelum untuk jalur otomatis, generateKuitansiManual untuk
// jalur manual/pelunasan).
async function generateDanKirimKuitansi(timId: string, hargaDasar: number) {
  const tim = await prisma.tim.findUnique({
    where: { id: timId },
    include: { pembayaran: true, user: true },
  });
  if (!tim?.pembayaran) return { success: false, message: "Data pembayaran tidak ditemukan" };

  const kode = await ensureKodeUnikDanTotal(timId, hargaDasar);
  if (!kode) return { success: false, message: "Gagal menyiapkan kode unik pembayaran" };

  const konfig = await getKonfigUmum();

  const pdfBuffer = await buildKuitansiPdf({
    namaTim: tim.nama_tim,
    asalSekolah: tim.asal_sekolah,
    jenjang: tim.jenjang,
    isDP: tim.pembayaran.isDP,
    hargaDasar,
    kodeUnik: kode.kodeUnik,
    totalBayar: kode.totalBayar,
    tanggal: new Date(),
    bendaharaNama: konfig.bendaharaNama,
    bendaharaTtdUrl: konfig.bendaharaTtdUrl,
  });

  const upload = await imageUploader(pdfBuffer);
  if (upload.error) return { success: false, message: "Gagal upload kuitansi: " + upload.message };

  await prisma.pembayaran.update({
    where: { tim_id: timId },
    data: { kuitansiUrl: upload.data!.url },
  });

  if (tim.user?.email) {
    const namaFile = `Kuitansi-${tim.asal_sekolah.replace(/[^a-z0-9]+/gi, "-")}.pdf`;
    await sendMailTo({
      to: tim.user.email,
      subject: "Kuitansi Pembayaran Pendaftaran - LKBB Antareja 2026",
      html: `<p>Halo ${tim.pelatih},</p><p>Pembayaran pendaftaran tim <b>${tim.nama_tim}</b> (${tim.asal_sekolah}) sudah terverifikasi${tim.pembayaran.isDP ? " (DP 50%)" : " (Lunas)"}. Kuitansi terlampir sebagai bukti resmi.</p><p>Terima kasih.</p>`,
      fileAttachments: [{ filename: namaFile, path: upload.data!.url }],
    });
  }
  return { success: true };
}

// Jalur otomatis — dipanggil sekali begitu pembayaran pertama kali confirmed
// (kalau kuitansiUrl sudah ada, tidak diulang lagi supaya tidak kirim email
// dobel kalau admin toggle confirm/batal/confirm lagi). Untuk pelunasan atau
// perlu kirim ulang, pakai generateKuitansiManual di bawah.
async function kirimKuitansiJikaBelum(timId: string, hargaDasar: number) {
  const pembayaran = await prisma.pembayaran.findUnique({ where: { tim_id: timId } });
  if (!pembayaran || pembayaran.kuitansiUrl) return null;
  try {
    const result = await generateDanKirimKuitansi(timId, hargaDasar);
    // Gagal generate/kirim kuitansi tidak boleh menggagalkan konfirmasi
    // pembayaran itu sendiri — tapi HARUS dikembalikan ke pemanggil (bukan
    // ditelan diam-diam) supaya admin lihat pesannya, bukan cuma di log server.
    if (!result.success) console.error("kirimKuitansiJikaBelum gagal:", result.message);
    return result;
  } catch (e) {
    console.error("kirimKuitansiJikaBelum error:", e);
    return { success: false, message: "Gagal membuat/mengirim kuitansi" };
  }
}

// Jalur manual — tombol "Generate Ulang Kuitansi" di halaman detail
// pembayaran admin. Dipakai mis. untuk pelunasan (tim yang sebelumnya bayar
// DP, sekarang lunas) supaya kuitansi & email terbaru terkirim ulang dengan
// nominal/status yang sudah diupdate. Hanya ADMIN/BENDAHARA.
export async function generateKuitansiManual(timId: string) {
  try {
    await requireAdmin();
    const tim = await prisma.tim.findUnique({ where: { id: timId }, include: { pembayaran: true } });
    if (!tim?.confirmed) return { success: false, message: "Pembayaran tim ini belum dikonfirmasi" };
    const jumlah = await biayaPendaftaran(tim.jenjang, tim.pembayaran?.isDP ?? false);
    const result = await generateDanKirimKuitansi(timId, jumlah);
    if (result.success) {
      revalidatePath("/", "layout");
      revalidatePath(`/admin/pembayaran/${timId}`);
    }
    return result;
  } catch (e) {
    console.error("generateKuitansiManual error:", e);
    return { success: false, message: "Gagal generate kuitansi" };
  }
}

// Logika inti dipakai baik dari toggle cepat di daftar pembayaran (approvePayment)
// maupun form konfirmasi di halaman detail (konfirmasiPembayaran) — sebelumnya
// dua fungsi ini duplikat persis, gampang saling tidak sinkron kalau salah satu
// diubah tanpa yang lain.
async function setStatusPembayaran(timId: string, confirmed: boolean, isDP: boolean) {
  // Dua write independen (tabel berbeda, tidak saling bergantung) — paralel.
  const [tim] = await Promise.all([
    updateTim({ id: timId }, { confirmed }),
    updatePembayaran({ tim_id: timId }, { isDP }),
  ]);
  if (!confirmed) return null;

  await assignNoUrutIfNeeded(timId);

  const jumlah = await biayaPendaftaran(tim.jenjang, isDP);

  const existing = await prisma.kasTransaksi.findFirst({
    where: { sumber: "PENDAFTARAN", referensiId: timId },
  });
  if (!existing) {
    await prisma.kasTransaksi.create({
      data: {
        tipe: "PEMASUKAN",
        keterangan: `Pendaftaran Tim ${tim.nama_tim} — ${tim.asal_sekolah}`,
        jumlah,
        kategori: "PENDAFTARAN_TIM",
        sumber: "PENDAFTARAN",
        referensiId: timId,
      },
    });
  }

  return kirimKuitansiJikaBelum(timId, jumlah);
}

export async function approvePayment(timId: string, isDP: boolean) {
  try {
    await requireAdmin();
    const kuitansi = await setStatusPembayaran(timId, true, isDP);
    revalidatePath("/", "layout");
    revalidatePath("/admin/kas");
    if (kuitansi && !kuitansi.success) {
      return { success: true, message: `Pembayaran terkonfirmasi, tapi kuitansi gagal dibuat: ${kuitansi.message}` };
    }
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false };
  }
}

export async function batalkanKonfirmasi(timId: string) {
  try {
    await requireAdmin();
    await updateTim({ id: timId }, { confirmed: false });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false };
  }
}

export default async function konfirmasiPembayaran(
  data: FormData,
  idTim: string
) {
  await requireAdmin();
  const status = data.get("confirm") === "true";
  const statusPembayaran = data.get("isDP") === "true";

  try {
    const kuitansi = await setStatusPembayaran(idTim, status, statusPembayaran);
    revalidatePath("/", "layout");
    revalidatePath("/admin/kas");
    if (kuitansi && !kuitansi.success) {
      return {
        success: true,
        message: `Berhasil mengupdate status pembayaran, tapi kuitansi gagal dibuat: ${kuitansi.message}`,
      };
    }
    return { success: true, message: "Berhasil mengupdate status pembayaran!" };
  } catch {
    return {
      success: false,
      message: "Gagal mengupdate status pembayaran",
    };
  }
}
