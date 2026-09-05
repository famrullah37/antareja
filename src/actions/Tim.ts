"use server";

import { getServerSession } from "@/lib/next-auth";
import { revalidatePath } from "next/cache";
import { updateTim } from "@/queries/tim.query";
import { Tipe } from "@prisma/client";
import prisma from "@/lib/prisma";
import { imageUploader, validateUploadFile } from "./fileUploader";

async function requireAdmin() {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN") throw new Error("Forbidden");
}

export async function getTimById(timId: string) {
  try {
    const tim = await prisma.tim.findUnique({
      where: { id: timId },
      include: { anggotas: true, pembayaran: true },
    });
    if (!tim) return { success: false, message: "Tim tidak ditemukan" };
    return { success: true, data: tim };
  } catch {
    return { success: false, message: "Gagal mengambil data tim" };
  }
}

export async function updateTimForm(id: string, formData: FormData) {
  const session = await getServerSession();
  if (!session?.user?.id) return { success: false, message: "Unauthorized" };

  // Hanya user pemilik tim yang boleh update link
  const tim = await prisma.tim.findUnique({ where: { id } });
  if (!tim || tim.userId !== session.user.id)
    return { success: false, message: "Forbidden" };

  const link_berkas = formData.get("link_berkas") as string;
  const link_video = formData.get("link_video") as string;
  const foto = formData.get("foto") as File | null;

  try {
    let fotoUrl: string | undefined;
    if (foto && foto.size > 0) {
      const fileCheck = await validateUploadFile(foto);
      if (!fileCheck.valid) return { success: false, message: fileCheck.message };
      const upload = await imageUploader(Buffer.from(await foto.arrayBuffer()));
      if (upload.error) return { success: false, message: "Gagal upload foto tim" };
      fotoUrl = upload.data!.url;
    }

    await updateTim({ id }, { link_berkas, link_video, ...(fotoUrl ? { foto: fotoUrl } : {}) });
    revalidatePath("/", "layout");
    return { success: true, message: "Berhasil memperbarui Link" };
  } catch {
    return { success: false, message: "Gagal memperbarui Link" };
  }
}

export async function updateTimFormAdmin(data: FormData, id: string) {
  await requireAdmin();
  const asal_sekolah = data.get("asal_sekolah") as string;
  const tipe_tim = data.get("tipe_tim") as Tipe;
  const noUrutRaw = data.get("noUrut") as string;
  const noUrut = noUrutRaw?.trim() ? parseInt(noUrutRaw) : null;

  try {
    await updateTim({ id }, { asal_sekolah, tipe_tim, noUrut });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (e: any) {
    if (e?.code === "P2002") {
      return { success: false, message: "No. urut sudah dipakai tim lain di jenjang yang sama" };
    }
    return { success: false };
  }
}

export async function deleteTimForm(id: string) {
  await requireAdmin();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.penilaianBaru.deleteMany({ where: { timId: id } });
      await tx.penilaian.deleteMany({ where: { tim_id: id } });
      await tx.tim.delete({ where: { id } });
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false };
  }
}
