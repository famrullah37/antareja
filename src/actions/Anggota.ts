"use server";

import { getServerSession } from "@/lib/next-auth";
import {
  createAnggota,
  findAnggota,
  updateAnggota,
} from "@/queries/anggota.query";
import { findTimsByUser } from "@/queries/tim.query";
import prisma from "@/lib/prisma";
import { Kelas, Posisi, Prisma } from "@prisma/client";
import { compressPhoto, imageUploader, validateUploadFile } from "./fileUploader";
import { revalidatePath } from "next/cache";
import { isHttpUrl } from "@/lib/safeUrl";

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
  const email = ((data.get("email") as string) || "").trim();
  const telp = data.get("telp") as string;
  const nisn = data.get("nisn") as string | undefined;
  const foto = data.get("foto") as File;
  const kelas = data.get("kelas") as Kelas | undefined;
  // null (bukan undefined) supaya link yang dikosongkan benar-benar terhapus saat update.
  const link_ig = ((data.get("link_ig") as string) || "").trim() || null;
  if (link_ig && !isHttpUrl(link_ig)) return { success: false, message: "Link Instagram harus diawali https://" };
  const tglLahirRaw = data.get("tanggal_lahir") as string | null;
  // Input type="date" mengirim "YYYY-MM-DD"; simpan sebagai tengah malam UTC
  // supaya kolom DATE tidak geser sehari karena zona waktu.
  const tanggal_lahir =
    tglLahirRaw && /^\d{4}-\d{2}-\d{2}$/.test(tglLahirRaw)
      ? new Date(`${tglLahirRaw}T00:00:00.000Z`)
      : undefined;
  const siswa = posisi !== "OFFICIAL" && posisi !== "PELATIH";
  if (!Object.values(Posisi).includes(posisi)) return { success: false, message: "Posisi tidak valid" };
  if (siswa && !tanggal_lahir) return { success: false, message: "Tanggal lahir wajib diisi" };

  const tryFindAnggota = await findAnggota({ id });
  // id anggota dikirim dari klien — pastikan anggota yang mau diedit memang
  // milik tim yang barusan divalidasi kepemilikannya, bukan tim lain.
  if (tryFindAnggota && tryFindAnggota.timId !== timId)
    return { success: false, message: "Forbidden" };

  // Email PELATIH boleh sama di beberapa tim (satu pelatih melatih 2+ tim);
  // posisi lain tetap unik. Dicek sebelum upload foto supaya tidak buang kuota
  // Cloudinary — index unik parsial di DB tetap jadi jaring pengaman.
  if (posisi !== "PELATIH") {
    const dipakai = await prisma.anggota.findFirst({
      where: { email, posisi: { not: "PELATIH" }, ...(tryFindAnggota ? { id: { not: tryFindAnggota.id } } : {}) },
      select: { id: true },
    });
    if (dipakai) return { success: false, message: "Email sudah dipakai anggota lain" };
  }

  try {
    let fotoUrl: string | undefined;
    if (foto.name !== "undefined") {
      const fileCheck = await validateUploadFile(foto, { maxMB: 10 });
      if (!fileCheck.valid) return { success: false, message: fileCheck.message };
      const compressed = await compressPhoto(Buffer.from(await foto.arrayBuffer()));
      const uploadedFoto = await imageUploader(compressed);
      if (uploadedFoto.error) return { success: false, message: uploadedFoto.message };
      fotoUrl = uploadedFoto.data?.url;
    }

    const anggotaData = { nama, email, telp, nisn, kelas, posisi, link_ig, tanggal_lahir };
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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return { success: false, message: "Email sudah dipakai anggota lain" };
    console.error(error);
    return { success: false, message: "Gagal memperbarui anggota" };
  }
}
