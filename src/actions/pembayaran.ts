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

// Generate kuitansi PDF, upload ke Cloudinary, simpan link-nya, dan kirim ke
// email pendaftar — dipanggil sekali begitu pembayaran pertama kali confirmed
// (kalau kuitansiUrl sudah ada, tidak diulang lagi supaya tidak kirim email
// dobel kalau admin toggle confirm/batal/confirm lagi).
async function kirimKuitansiJikaBelum(timId: string, hargaDasar: number) {
  const tim = await prisma.tim.findUnique({
    where: { id: timId },
    include: { pembayaran: true, user: true },
  });
  if (!tim?.pembayaran || tim.pembayaran.kuitansiUrl) return;
  if (!tim.pembayaran.kodeUnik || !tim.pembayaran.totalBayar) return; // tim lama sebelum fitur ini ada

  try {
    const pdfBuffer = await buildKuitansiPdf({
      namaTim: tim.nama_tim,
      asalSekolah: tim.asal_sekolah,
      jenjang: tim.jenjang,
      isDP: tim.pembayaran.isDP,
      hargaDasar,
      kodeUnik: tim.pembayaran.kodeUnik,
      totalBayar: tim.pembayaran.totalBayar,
      tanggal: new Date(),
    });

    const upload = await imageUploader(pdfBuffer);
    if (upload.error) {
      console.error("Upload kuitansi gagal:", upload.message);
      return;
    }

    await prisma.pembayaran.update({
      where: { tim_id: timId },
      data: { kuitansiUrl: upload.data!.url },
    });

    if (tim.user?.email) {
      const namaFile = `Kuitansi-${tim.asal_sekolah.replace(/[^a-z0-9]+/gi, "-")}.pdf`;
      await sendMailTo({
        to: tim.user.email,
        subject: "Kuitansi Pembayaran Pendaftaran - LKBB Antareja 2026",
        html: `<p>Halo ${tim.pelatih},</p><p>Pembayaran pendaftaran tim <b>${tim.nama_tim}</b> (${tim.asal_sekolah}) sudah terverifikasi. Kuitansi terlampir sebagai bukti resmi.</p><p>Terima kasih.</p>`,
        fileAttachments: [{ filename: namaFile, path: upload.data!.url }],
      });
    }
  } catch (e) {
    // Gagal generate/kirim kuitansi tidak boleh menggagalkan konfirmasi
    // pembayaran itu sendiri — cukup dicatat, admin masih bisa lihat status
    // confirmed=true dan generate ulang/kirim manual kalau perlu nanti.
    console.error("kirimKuitansiJikaBelum error:", e);
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
  if (!confirmed) return;

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

  await kirimKuitansiJikaBelum(timId, jumlah);
}

export async function approvePayment(timId: string, isDP: boolean) {
  try {
    await requireAdmin();
    await setStatusPembayaran(timId, true, isDP);
    revalidatePath("/", "layout");
    revalidatePath("/admin/kas");
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
    await setStatusPembayaran(idTim, status, statusPembayaran);
    revalidatePath("/", "layout");
    revalidatePath("/admin/kas");
    return { success: true, message: "Berhasil mengupdate status pembayaran!" };
  } catch {
    return {
      success: false,
      message: "Gagal mengupdate status pembayaran",
    };
  }
}
