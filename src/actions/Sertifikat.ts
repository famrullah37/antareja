"use server";

import { getServerSession } from "@/lib/next-auth";
import { imageUploader } from "./fileUploader";
import {
  createSertifikat,
  deleteSertifikatById,
  deleteSertifikatByTim,
} from "@/queries/sertifikat.query";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN") throw new Error("Forbidden");
}

export async function addSertifikat(data: FormData) {
  await requireAdmin();
  const timId = data.get("timId") as string;
  const namaAnggota = (data.get("namaAnggota") as string) || null;
  const namaJuara = (data.get("namaJuara") as string) || null;
  const files = data.getAll("files") as File[];

  try {
    for (const file of files) {
      if (!file || file.size === 0) continue;
      const upload = await imageUploader(Buffer.from(await file.arrayBuffer()));
      if (upload.error) return { success: false, message: upload.message };
      await createSertifikat({ timId, fileUrl: upload.data!.url, namaAnggota, namaJuara });
    }
    revalidatePath("/admin/sertifikat");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Gagal menyimpan sertifikat" };
  }
}

export async function removeSertifikat(id: string) {
  await requireAdmin();
  try {
    await deleteSertifikatById(id);
    revalidatePath("/admin/sertifikat");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Gagal menghapus sertifikat" };
  }
}

export async function removeAllSertifikatTim(timId: string) {
  await requireAdmin();
  try {
    await deleteSertifikatByTim(timId);
    revalidatePath("/admin/sertifikat");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Gagal menghapus sertifikat" };
  }
}
