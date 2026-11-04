"use server";

import { getServerSession } from "@/lib/next-auth";
import { isHttpUrl } from "@/lib/safeUrl";
import { imageUploader, validateUploadFile } from "./fileUploader";
import {
  createSponsor,
  deleteSponsor,
  updateSponsor,
} from "@/queries/sponsor.query";
import { revalidatePath } from "next/cache";

const TIPE_SPONSOR = ["SPONSOR", "MEDIA_PARTNER", "SUPPORT_BY"];

async function requireAdmin() {
  const session = await getServerSession();
  if (!["ADMIN", "SIE_HUMAS"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
}

export async function createSponsorForm(data: FormData) {
  await requireAdmin();
  const nama = data.get("nama") as string;
  const linkUrl = ((data.get("linkUrl") as string) || "").trim() || undefined;
  if (linkUrl && !isHttpUrl(linkUrl)) return { success: false, message: "Link harus diawali https://" };
  const tipe = (data.get("tipe") as string) || "SPONSOR";
  if (!TIPE_SPONSOR.includes(tipe)) return { success: false, message: "Tipe tidak valid" };
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

// Edit sponsor: nama, link, tipe, urutan. Logo opsional — kosong = logo lama tetap.
export async function updateSponsorForm(id: string, data: FormData) {
  await requireAdmin();
  const nama = ((data.get("nama") as string) || "").trim();
  if (!nama || nama.length > 100) return { success: false, message: "Nama wajib diisi (maks. 100 karakter)" };
  const linkUrl = ((data.get("linkUrl") as string) || "").trim() || null;
  if (linkUrl && !isHttpUrl(linkUrl)) return { success: false, message: "Link harus diawali https://" };
  const tipe = (data.get("tipe") as string) || "SPONSOR";
  if (!TIPE_SPONSOR.includes(tipe)) return { success: false, message: "Tipe tidak valid" };
  const urutan = parseInt((data.get("urutan") as string) || "0");
  const logo = data.get("logo") as File | null;

  try {
    let logoUrl: string | undefined;
    if (logo && logo.size > 0) {
      const fileCheck = await validateUploadFile(logo);
      if (!fileCheck.valid) return { success: false, message: fileCheck.message };
      const upload = await imageUploader(Buffer.from(await logo.arrayBuffer()));
      if (upload.error) return { success: false, message: upload.message };
      logoUrl = upload.data!.url;
    }
    await updateSponsor(
      { id },
      { nama, linkUrl, tipe, urutan: Number.isFinite(urutan) ? urutan : 0, ...(logoUrl ? { logoUrl } : {}) }
    );
    revalidatePath("/", "layout");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Gagal menyimpan perubahan" };
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
