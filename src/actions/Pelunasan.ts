"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/next-auth";
import { batasiAksi } from "@/lib/rateLimit";
import { notifPembayaranMasuk } from "@/lib/emailPembayaran";
import { imageUploader, validateUploadFile } from "./fileUploader";

// Peserta (tim DP yang sudah terkonfirmasi) mengunggah bukti transfer pelunasan
// dari dashboard. Boleh diunggah ulang (menimpa) selama belum dikonfirmasi lunas
// — mis. salah pilih gambar. Nominal & kode unik sudah dicadangkan lebih dulu
// oleh siapkanPelunasan saat dashboard dibuka.
export async function kirimBuktiPelunasan(data: FormData) {
  const dibatasi = await batasiAksi("pelunasan", 20, 60 * 60 * 1000);
  if (dibatasi) return { success: false, message: dibatasi };
  const session = await getServerSession();
  if (!session?.user?.id) return { success: false, message: "Anda harus login terlebih dahulu" };

  const bukti = data.get("buktiPelunasan") as File | null;
  const bank = ((data.get("bankPelunasan") as string) ?? "").trim();
  const namaRek = ((data.get("namaRekPelunasan") as string) ?? "").trim();
  if (!bank || !namaRek) return { success: false, message: "Lengkapi nama bank & nama pemilik rekening" };
  if (bank.length > 100 || namaRek.length > 100) return { success: false, message: "Nama bank/rekening terlalu panjang" };

  const tim = await prisma.tim.findFirst({ where: { userId: session.user.id }, include: { pembayaran: true } });
  const p = tim?.pembayaran;
  if (!tim || !p) return { success: false, message: "Tim tidak ditemukan" };
  if (!tim.confirmed) return { success: false, message: "Pembayaran DP belum dikonfirmasi panitia" };
  if (!p.isDP) return { success: false, message: "Pembayaran tim Anda sudah lunas" };
  if (!p.pelunasanKodeUnik || p.pelunasanTotal == null)
    return { success: false, message: "Nominal pelunasan belum tersedia, muat ulang halaman" };

  const cek = await validateUploadFile(bukti);
  if (!cek.valid) return { success: false, message: cek.message };
  const upload = await imageUploader(Buffer.from(await bukti!.arrayBuffer()));
  if (upload.error) return { success: false, message: "Gagal upload bukti pelunasan" };

  await prisma.pembayaran.update({
    where: { tim_id: tim.id },
    data: { pelunasanBukti: upload.data!.url, pelunasanBank: bank, pelunasanNamaRek: namaRek, pelunasanAt: new Date() },
  });

  notifPembayaranMasuk({
    jenis: "Pelunasan Pendaftaran Tim",
    pathAdmin: "/admin/pembayaran",
    nama: `${tim.nama_tim} — ${tim.asal_sekolah}`,
    kontak: session.user.email,
    totalBayar: p.pelunasanTotal,
    kodeUnik: p.pelunasanKodeUnik,
    metodePembayaran: "TRANSFER",
    buktiUrl: upload.data!.url,
    detail: `Pelunasan DP · Jenjang ${tim.jenjang} · ${bank} a.n. ${namaRek}`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin/pembayaran", "layout");
  return { success: true };
}
