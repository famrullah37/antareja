"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/next-auth";
import { catatLog } from "@/lib/activityLog";
import { kunciRuangan, tempatkanTim, Tolak } from "@/lib/ruangan";

type Hasil = { success: boolean; message?: string };

const MAKS_KAPASITAS = 100;

async function requireStaf() {
  const session = await getServerSession();
  if (!["ADMIN", "SIE_LOMBA"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
}

function segarkan() {
  revalidatePath("/admin/basecamp");
  revalidatePath("/admin/menginap");
  revalidatePath("/dashboard");
}

function isUniqueViolation(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

function bacaRuangan(data: FormData) {
  const nama = ((data.get("nama") as string) || "").trim().slice(0, 100);
  const kapasitas = parseInt((data.get("kapasitas") as string) || "", 10);
  const keterangan = ((data.get("keterangan") as string) || "").trim().slice(0, 500) || null;
  if (!nama) return "Nama ruangan wajib diisi";
  if (!Number.isInteger(kapasitas) || kapasitas < 1 || kapasitas > MAKS_KAPASITAS)
    return `Kapasitas harus 1–${MAKS_KAPASITAS} tim`;
  return { nama, kapasitas, keterangan };
}

function gagal(e: unknown, pesan: string): Hasil {
  if (e instanceof Tolak) return { success: false, message: e.message };
  if (isUniqueViolation(e)) return { success: false, message: "Nama ruangan sudah dipakai" };
  console.error(e);
  return { success: false, message: pesan };
}

export async function createRuangan(data: FormData): Promise<Hasil> {
  await requireStaf();
  const isi = bacaRuangan(data);
  if (typeof isi === "string") return { success: false, message: isi };
  try {
    await prisma.ruangan.create({ data: isi });
    await catatLog("TAMBAH_RUANGAN", `${isi.nama} (${isi.kapasitas} tim)`);
    segarkan();
    return { success: true };
  } catch (e) {
    return gagal(e, "Gagal menambah ruangan");
  }
}

export async function updateRuangan(id: string, data: FormData): Promise<Hasil> {
  await requireStaf();
  const isi = bacaRuangan(data);
  if (typeof isi === "string") return { success: false, message: isi };
  try {
    await prisma.$transaction(async (tx) => {
      await kunciRuangan(tx, id);
      const terisi = await tx.tim.count({ where: { ruanganId: id } });
      if (isi.kapasitas < terisi)
        throw new Tolak(`Ruangan ini sudah berisi ${terisi} tim — pindahkan dulu sebagian tim`);
      await tx.ruangan.update({ where: { id }, data: isi });
    });
    await catatLog("UBAH_RUANGAN", `${isi.nama} (${isi.kapasitas} tim)`);
    segarkan();
    return { success: true };
  } catch (e) {
    return gagal(e, "Gagal menyimpan ruangan");
  }
}

export async function deleteRuangan(id: string): Promise<Hasil> {
  await requireStaf();
  try {
    const r = await prisma.ruangan.delete({ where: { id }, include: { _count: { select: { tims: true } } } });
    await catatLog("HAPUS_RUANGAN", `${r.nama} (${r._count.tims} tim kehilangan ruangan)`);
    segarkan();
    return { success: true };
  } catch (e) {
    return gagal(e, "Gagal menghapus ruangan");
  }
}

// Tempatkan tim ke ruangan (ruanganId null = keluarkan dari ruangan).
export async function setRuanganTim(timId: string, ruanganId: string | null): Promise<Hasil> {
  await requireStaf();
  try {
    const { tim, ruangan } = await prisma.$transaction((tx) => tempatkanTim(tx, timId, ruanganId));
    await catatLog("SET_RUANGAN_TIM", `${tim.nama_tim} → ${ruangan?.nama ?? "(tanpa ruangan)"}`);
    segarkan();
    return { success: true };
  } catch (e) {
    return gagal(e, "Gagal menempatkan tim");
  }
}
