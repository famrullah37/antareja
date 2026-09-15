"use server";

import { getServerSession } from "@/lib/next-auth";
import {
  createAnggota,
  findAnggota,
  updateAnggota,
} from "@/queries/anggota.query";
import { findTimsByUser } from "@/queries/tim.query";
import { Kelas, Posisi } from "@prisma/client";
import { imageUploader, validateUploadFile } from "./fileUploader";
import { revalidatePath } from "next/cache";

export async function upsertAnggotaForm(
  data: FormData,
  posisi: Posisi,
  id: string,
  timId: string
) {
  const session = await getServerSession();
  if (!session?.user?.id) return { success: false, message: "Unauthorized" };

  const userTims = await findTimsByUser(session.user.id);
  const owned = userTims.some((t) => t.id === timId);
  if (!owned) return { success: false, message: "Forbidden" };

  const nama = data.get("nama") as string;
  const email = data.get("email") as string;
  const telp = data.get("telp") as string;
  const nisn = data.get("nisn") as string | undefined;
  const foto = data.get("foto") as File;
  const kelas = data.get("kelas") as Kelas | undefined;
  const link_ig = data.get("link_ig") as string | undefined;

  const tryFindAnggota = await findAnggota({ id });
  // id anggota dikirim dari klien — pastikan anggota yang mau diedit memang
  // milik tim yang barusan divalidasi kepemilikannya, bukan tim lain.
  if (tryFindAnggota && tryFindAnggota.timId !== timId)
    return { success: false, message: "Forbidden" };

  try {
    let fotoUrl: string | undefined;
    if (foto.name !== "undefined") {
      const fileCheck = await validateUploadFile(foto, { maxMB: 10 });
      if (!fileCheck.valid) return { success: false, message: fileCheck.message };
      const fotoBuffer = await foto.arrayBuffer();
      const uploadedFoto = await imageUploader(Buffer.from(fotoBuffer));
      fotoUrl = uploadedFoto?.data?.url;
    }

    const anggotaData = { nama, email, telp, nisn, kelas, posisi, link_ig };
    const anggotaUpdate = { ...anggotaData, foto: fotoUrl ?? undefined };
    const anggotaCreate = {
      ...anggotaData,
      foto: fotoUrl!,
      Tim: { connect: { id: timId } },
    };

    if (tryFindAnggota) await updateAnggota({ id }, anggotaUpdate);
    else await createAnggota(anggotaCreate);
    revalidatePath("/", "layout");
    return { success: true, message: "Berhasil memperbarui anggota!" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Gagal memperbarui anggota" };
  }
}
