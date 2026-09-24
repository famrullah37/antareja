"use server";

import prisma from "@/lib/prisma";
import { imageUploader, validateUploadFile } from "./fileUploader";
import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/next-auth";
import { catatLog } from "@/lib/activityLog";

async function requireAdmin() {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "BENDAHARA")
    throw new Error("Forbidden");
}

// Khusus penghapusan: ADMIN saja untuk entri otomatis (FOTO/TIKET/VOTING/
// PENDAFTARAN — merekam pembayaran nyata yang sudah terverifikasi), tapi
// BENDAHARA tetap boleh hapus entri MANUAL yang mereka input sendiri (mis.
// salah ketik) — sama seperti sebelumnya.
async function requireBolehHapus(sumber: string) {
  const session = await getServerSession();
  const role = session?.user?.role;
  if (sumber === "MANUAL") {
    if (role !== "ADMIN" && role !== "BENDAHARA") throw new Error("Forbidden");
  } else {
    if (role !== "ADMIN") throw new Error("Forbidden");
  }
}

export async function addKasTransaksi(data: FormData) {
  await requireAdmin();
  const tipe = data.get("tipe") as string;
  const keterangan = data.get("keterangan") as string;
  const vendor = (data.get("vendor") as string) || undefined;
  const jumlah = parseInt(data.get("jumlah") as string);
  const kategori = (data.get("kategori") as string) || "LAINNYA";
  const notaFile = data.get("nota") as File | null;

  let notaUrl: string | undefined;
  if (notaFile && notaFile.size > 0) {
    const fileCheck = await validateUploadFile(notaFile, { allowPdf: true });
    if (!fileCheck.valid) return { success: false, message: fileCheck.message };
    const buffer = Buffer.from(await notaFile.arrayBuffer());
    const result = await imageUploader(buffer);
    if (result.error) return { success: false, message: result.message };
    notaUrl = result.data?.url;
  }

  try {
    await prisma.kasTransaksi.create({
      data: { tipe, keterangan, vendor, jumlah, kategori, nota: notaUrl, sumber: "MANUAL" },
    });
    revalidatePath("/admin/kas");
    return { success: true };
  } catch {
    return { success: false, message: "Gagal menyimpan transaksi kas" };
  }
}

export async function deleteKasTransaksi(id: string) {
  try {
    const kas = await prisma.kasTransaksi.findUnique({ where: { id } });
    if (!kas) return { success: false, message: "Transaksi kas tidak ditemukan" };
    await requireBolehHapus(kas.sumber);

    await prisma.kasTransaksi.delete({ where: { id } });
    await catatLog(
      "HAPUS_KAS",
      `${kas.tipe === "PEMASUKAN" ? "Pemasukan" : "Pengeluaran"}: ${kas.keterangan} — Rp${kas.jumlah} [${kas.sumber}]`
    );
    revalidatePath("/admin/kas");
    return { success: true };
  } catch (e: any) {
    if (e?.message === "Forbidden") {
      return { success: false, message: "Hanya ADMIN yang boleh menghapus entri kas otomatis (Foto/Tiket/Voting/Pendaftaran)" };
    }
    return { success: false };
  }
}
