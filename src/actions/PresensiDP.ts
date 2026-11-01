"use server";

import prisma from "@/lib/prisma";
import { Posisi } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/next-auth";
import { catatLog } from "@/lib/activityLog";
import { posisiPresensi } from "@/lib/presensiDp";

type Hasil = { success: boolean; message?: string };

// Presensi Daerah Persiapan = tugas Sie Lomba (bersama Admin).
async function requireStaf() {
  const session = await getServerSession();
  const user = session?.user;
  if (!user || !["ADMIN", "SIE_LOMBA"].includes(user.role ?? "")) throw new Error("Forbidden");
  return user.nama ?? user.email ?? "Panitia";
}

function segarkan() {
  revalidatePath("/admin/presensi-dp", "layout");
}

async function timTerkonfirmasi(timId: string) {
  return prisma.tim.findFirst({
    where: { id: timId, confirmed: true },
    select: { id: true, nama_tim: true, tipe_tim: true },
  });
}

// Centang/hapus centang "sesuai" satu anggota. Centang pertama = tim tercatat hadir di DP.
export async function setSesuaiAnggota(timId: string, anggotaId: string, sesuai: boolean): Promise<Hasil> {
  const oleh = await requireStaf();
  const tim = await timTerkonfirmasi(timId);
  if (!tim) return { success: false, message: "Tim tidak ditemukan atau pembayaran belum terkonfirmasi" };
  const anggota = await prisma.anggota.findFirst({ where: { id: anggotaId, timId }, select: { posisi: true } });
  if (!anggota || !posisiPresensi(tim.tipe_tim).includes(anggota.posisi))
    return { success: false, message: "Anggota tidak ditemukan di tim ini" };

  try {
    if (!sesuai) {
      await prisma.presensiAnggota.deleteMany({ where: { anggotaId } });
    } else {
      const presensi = await prisma.presensiDP.upsert({
        where: { timId },
        create: { timId, olehNama: oleh },
        update: {},
      });
      await prisma.presensiAnggota.upsert({
        where: { anggotaId },
        create: { presensiId: presensi.id, anggotaId, olehNama: oleh },
        update: {},
      });
    }
    segarkan();
    return { success: true };
  } catch (e) {
    console.error("setSesuaiAnggota error:", e);
    return { success: false, message: "Gagal menyimpan presensi" };
  }
}

// Centang semua Danton & pasukan yang belum dicentang.
export async function centangSemuaSesuai(timId: string): Promise<Hasil> {
  const oleh = await requireStaf();
  const tim = await timTerkonfirmasi(timId);
  if (!tim) return { success: false, message: "Tim tidak ditemukan atau pembayaran belum terkonfirmasi" };
  try {
    const n = await prisma.$transaction(async (tx) => {
      const presensi = await tx.presensiDP.upsert({
        where: { timId },
        create: { timId, olehNama: oleh },
        update: {},
      });
      const belum = await tx.anggota.findMany({
        where: { timId, posisi: { in: posisiPresensi(tim.tipe_tim) as Posisi[] }, presensiDP: null },
        select: { id: true },
      });
      await tx.presensiAnggota.createMany({
        data: belum.map((a) => ({ presensiId: presensi.id, anggotaId: a.id, olehNama: oleh })),
        skipDuplicates: true,
      });
      return belum.length;
    });
    await catatLog("PRESENSI_DP_CENTANG_SEMUA", `${tim.nama_tim}: ${n} anggota`);
    segarkan();
    return { success: true };
  } catch (e) {
    console.error("centangSemuaSesuai error:", e);
    return { success: false, message: "Gagal menyimpan presensi" };
  }
}

// Koreksi salah tim: hapus presensi tim beserta semua centangnya (kembali "Belum hadir").
export async function resetPresensiDP(timId: string): Promise<Hasil> {
  await requireStaf();
  try {
    const { count } = await prisma.presensiDP.deleteMany({ where: { timId } });
    if (count === 0) return { success: false, message: "Tim belum dipresensi" };
    const tim = await prisma.tim.findUnique({ where: { id: timId }, select: { nama_tim: true } });
    await catatLog("PRESENSI_DP_RESET", tim?.nama_tim ?? timId.slice(0, 8));
    segarkan();
    return { success: true };
  } catch (e) {
    console.error("resetPresensiDP error:", e);
    return { success: false, message: "Gagal mereset presensi" };
  }
}
