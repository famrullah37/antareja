"use server";

import { getServerSession } from "@/lib/next-auth";
import { revalidatePath } from "next/cache";
import {
  createPelanggaran,
  createPelanggaranTim,
  createSubKategoriMaster,
  deletePelanggaran,
  deleteSubKategoriMaster,
  recalcPenilaianBaru,
  upsertJuriKategori,
  upsertNilaiDiskritMaster,
  upsertNilaiJuri,
  upsertPenilaianBaru,
} from "@/queries/penilaianBaru.query";
import prisma from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN") throw new Error("Forbidden");
}

async function requireAdminOrJuri() {
  const session = await getServerSession();
  if (!["ADMIN", "JURI"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
}

export async function saveMasterNilaiDiskrit(data: FormData) {
  await requireAdmin();
  const kategori = data.get("kategori") as string;
  const predikat = data.get("predikat") as string;
  const warna = data.get("warna") as string;
  const nilaiRaw = data.get("nilai") as string;
  const urutan = parseInt(data.get("urutan") as string);
  try {
    const nilai = nilaiRaw.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
    await upsertNilaiDiskritMaster(kategori, predikat, { kategori, predikat, warna, nilai, urutan });
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false }; }
}

export async function deleteMasterNilaiDiskrit(id: string) {
  await requireAdmin();
  try {
    await prisma.nilaiDiskritMaster.delete({ where: { id } });
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false }; }
}

export async function saveSubKategori(data: FormData) {
  await requireAdmin();
  const kode = data.get("kode") as string;
  const nama = data.get("nama") as string;
  const kategori = data.get("kategori") as string;
  const maxNilai = parseInt(data.get("maxNilai") as string);
  const urutan = parseInt(data.get("urutan") as string);
  try {
    await createSubKategoriMaster({ kode, nama, kategori, maxNilai, urutan });
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false }; }
}

export async function removeSubKategori(id: string) {
  await requireAdmin();
  try {
    await deleteSubKategoriMaster(id);
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false }; }
}

export async function savePelanggaran(data: FormData) {
  await requireAdmin();
  const kode = data.get("kode") as string;
  const nama = data.get("nama") as string;
  const kategori = data.get("kategori") as string;
  const poinPengurangan = parseInt(data.get("poin") as string);
  try {
    await createPelanggaran({ kode, nama, kategori, poinPengurangan });
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false }; }
}

export async function removePelanggaran(id: string) {
  await requireAdmin();
  try {
    await deletePelanggaran(id);
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false }; }
}

export async function tugaskanJuriKategori(juriId: string, kategori: string) {
  await requireAdmin();
  try {
    await upsertJuriKategori(juriId, kategori);
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false }; }
}

export async function inputNilaiJuri(
  timId: string,
  juriId: string,
  scores: { subKategoriId: string; nilai: number; predikat: string; catatan?: string }[]
) {
  await requireAdminOrJuri();
  try {
    const penilaian = await upsertPenilaianBaru(timId);
    await Promise.all(
      scores.map((s) => upsertNilaiJuri(penilaian.id, juriId, s.subKategoriId, s.nilai, s.predikat, s.catatan))
    );
    await recalcPenilaianBaru(penilaian.id);
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false }; }
}

export async function inputPelanggaranTim(
  timId: string,
  pelanggaranId: string,
  jumlahKejadian: number,
  poinPerKejadian: number
) {
  await requireAdminOrJuri();
  try {
    const penilaian = await upsertPenilaianBaru(timId);
    await createPelanggaranTim(penilaian.id, pelanggaranId, jumlahKejadian, poinPerKejadian);
    await recalcPenilaianBaru(penilaian.id);
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false }; }
}

export async function saveKategoriLomba(data: FormData) {
  await requireAdmin();
  const nama = (data.get("nama") as string).trim().toUpperCase();
  try {
    await prisma.kategoriLomba.upsert({ where: { nama }, create: { nama }, update: {} });
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false }; }
}

export async function removeKategoriLomba(id: string) {
  await requireAdmin();
  try {
    await prisma.kategoriLomba.delete({ where: { id } });
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false }; }
}

export async function publishNilaiBaru(penilaianId: string, publish: boolean) {
  await requireAdmin();
  try {
    await prisma.penilaianBaru.update({
      where: { id: penilaianId },
      data: { published: publish, publishedAt: publish ? new Date() : null, status: publish ? "FINAL" : "DRAFT" },
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch { return { success: false }; }
}
