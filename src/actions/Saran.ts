"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/next-auth";
import { batasiAksi } from "@/lib/rateLimit";
import { catatLog } from "@/lib/activityLog";
import { KATEGORI_SARAN, SARAN_MAKS, SARAN_MIN } from "@/lib/saranTim";

type Hasil = { success: boolean; message?: string };

// Yang boleh membaca & menanggapi saran (sama dengan menu Saran & Masukan).
const ROLE_PENGELOLA = ["ADMIN", "SIE_ACARA", "SIE_LOMBA"];

async function requirePengelola() {
  const session = await getServerSession();
  if (!ROLE_PENGELOLA.includes(session?.user?.role ?? "")) throw new Error("Forbidden");
  return session!;
}

// Dikirim dari dashboard tim. Identitas tim diambil dari akun yang login
// (bukan dari form), lalu disimpan sebagai snapshot.
export async function kirimSaran(data: FormData): Promise<Hasil> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== "USER") return { success: false, message: "Silakan login sebagai tim" };

  const dibatasi = await batasiAksi("saran", 10, 60 * 60 * 1000);
  if (dibatasi) return { success: false, message: dibatasi };

  const kategori = String(data.get("kategori") ?? "");
  const isi = String(data.get("isi") ?? "").trim();
  const ratingRaw = Number(data.get("rating") ?? 0);
  const rating = Number.isInteger(ratingRaw) && ratingRaw >= 1 && ratingRaw <= 5 ? ratingRaw : null;

  if (!KATEGORI_SARAN.some((k) => k.key === kategori)) return { success: false, message: "Pilih kategori" };
  if (isi.length < SARAN_MIN) return { success: false, message: `Tulis minimal ${SARAN_MIN} karakter` };
  if (isi.length > SARAN_MAKS) return { success: false, message: `Maksimal ${SARAN_MAKS} karakter` };

  const tim = await prisma.tim.findFirst({
    where: { userId: session.user.id },
    select: { id: true, nama_tim: true, asal_sekolah: true, jenjang: true },
  });
  if (!tim) return { success: false, message: "Tim tidak ditemukan" };

  await prisma.saranTim.create({
    data: {
      timId: tim.id,
      namaTim: tim.nama_tim,
      asalSekolah: tim.asal_sekolah,
      jenjang: tim.jenjang,
      pengirim: session.user.name ?? session.user.email ?? "-",
      kategori,
      isi,
      rating,
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/admin/saran");
  return { success: true };
}

export async function tandaiSaranDibaca(ids: string[], dibaca: boolean): Promise<Hasil> {
  try {
    await requirePengelola();
  } catch {
    return { success: false, message: "Forbidden" };
  }
  await prisma.saranTim.updateMany({ where: { id: { in: ids } }, data: { dibaca } });
  revalidatePath("/admin/saran");
  return { success: true };
}

// Tanggapan panitia tampil ke tim pengirim di dashboard-nya.
export async function tanggapiSaran(id: string, tanggapan: string): Promise<Hasil> {
  try {
    await requirePengelola();
  } catch {
    return { success: false, message: "Forbidden" };
  }
  const teks = tanggapan.trim().slice(0, SARAN_MAKS);
  const saran = await prisma.saranTim.update({
    where: { id },
    data: { tanggapan: teks || null, dibaca: true },
  });
  await catatLog("TANGGAPI_SARAN", `Saran dari ${saran.namaTim} (${saran.asalSekolah})`);
  revalidatePath("/admin/saran");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function hapusSaran(id: string): Promise<Hasil> {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN") return { success: false, message: "Hanya admin yang boleh menghapus" };
  const saran = await prisma.saranTim.delete({ where: { id } });
  await catatLog("HAPUS_SARAN", `Saran dari ${saran.namaTim} (${saran.asalSekolah})`);
  revalidatePath("/admin/saran");
  return { success: true };
}
