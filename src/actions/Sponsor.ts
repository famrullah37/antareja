"use server";

import { getServerSession } from "@/lib/next-auth";
import { imageUploader, validateUploadFile } from "./fileUploader";
import {
  createSponsor,
  deleteSponsor,
  updateSponsor,
} from "@/queries/sponsor.query";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN") throw new Error("Forbidden");
}

export async function createSponsorForm(data: FormData) {
  await requireAdmin();
  const nama = data.get("nama") as string;
  const linkUrl = (data.get("linkUrl") as string) || undefined;
  const tipe = (data.get("tipe") as string) || "SPONSOR";
  const urutan = parseInt((data.get("urutan") as string) || "0");
  const logo = data.get("logo") as File;

  try {
    if (!logo || logo.size === 0) return { success: false, message: "Logo wajib diupload" };
    const fileCheck = await validateUploadFile(logo);
    if (!fileCheck.valid) return { success: false, message: fileCheck.message };
    const upload = await imageUploader(Buffer.from(await logo.arrayBuffer()));
    if (upload.error) return { success: false, message: upload.message };

    await createSponsor({ nama, logoUrl: upload.data!.url, linkUrl, tipe, urutan });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Gagal menambahkan sponsor" };
  }
}

export async function toggleAktifSponsor(id: string, aktif: boolean) {
  await requireAdmin();
  try {
    await updateSponsor({ id }, { aktif });
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function deleteSponsorForm(id: string) {
  await requireAdmin();
  try {
    await deleteSponsor({ id });
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false };
  }
}
