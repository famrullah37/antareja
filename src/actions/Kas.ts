"use server";

import prisma from "@/lib/prisma";
import { imageUploader } from "./fileUploader";
import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/next-auth";

async function requireAdmin() {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "BENDAHARA")
    throw new Error("Forbidden");
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
  await requireAdmin();
  try {
    await prisma.kasTransaksi.delete({ where: { id } });
    revalidatePath("/admin/kas");
    return { success: true };
  } catch {
    return { success: false };
  }
}
