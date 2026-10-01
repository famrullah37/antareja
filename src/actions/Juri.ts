"use server";

import { getServerSession } from "@/lib/next-auth";
import { imageUploader, validateUploadFile } from "./fileUploader";
import { createJuri, deleteJuri, updateJuri } from "@/queries/juri.query";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

// Samakan penugasan juri (JuriKategori) dengan checkbox kategori di form.
async function syncJuriKategori(juriId: string, data: FormData) {
  const kategori = Array.from(new Set(data.getAll("kategori").map(String).filter(Boolean)));
  await prisma.$transaction([
    prisma.juriKategori.deleteMany({ where: { juriId, kategori: { notIn: kategori } } }),
    prisma.juriKategori.createMany({
      data: kategori.map((k) => ({ juriId, kategori: k })),
      skipDuplicates: true,
    }),
  ]);
}

async function requireAdmin() {
  const session = await getServerSession();
  if (!["ADMIN", "SIE_LOMBA"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
}

export async function createJuriForm(data: FormData) {
  await requireAdmin();
  const nama = data.get("nama") as string;
  const email = data.get("email") as string;
  const no_hp = data.get("no_hp") as string;
  const foto = data.get("foto") as File;
  try {
    const fileCheck = await validateUploadFile(foto);
    if (!fileCheck.valid) return { success: false, message: fileCheck.message };
    const upload = await imageUploader(Buffer.from(await foto.arrayBuffer()));
    if (upload.error) return { success: false, message: upload.message };
    const juri = await createJuri({ nama, email, no_hp, kategori: "", foto: upload.data!.url });
    await syncJuriKategori(juri.id, data);
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false, message: "Gagal menambahkan juri" };
  }
}

export async function updateJuriForm(data: FormData, id: string) {
  await requireAdmin();
  const nama = data.get("nama") as string;
  const email = data.get("email") as string;
  const no_hp = data.get("no_hp") as string;
  const foto = data.get("foto") as File;
  try {
    const updateData: Record<string, string> = {};
    if (nama) updateData.nama = nama;
    if (email) updateData.email = email;
    if (no_hp) updateData.no_hp = no_hp;
    if (foto && foto.size > 0) {
      const fileCheck = await validateUploadFile(foto);
      if (!fileCheck.valid) return { success: false, message: fileCheck.message };
      const upload = await imageUploader(Buffer.from(await foto.arrayBuffer()));
      if (upload.error) return { success: false, message: upload.message };
      updateData.foto = upload.data!.url;
    }
    await updateJuri({ id }, updateData);
    await syncJuriKategori(id, data);
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false, message: "Gagal mengupdate juri" };
  }
}

export async function deleteJuriForm(id: string) {
  await requireAdmin();
  try {
    await deleteJuri({ id });
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false };
  }
}
