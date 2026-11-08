"use server";

import prisma from "@/lib/prisma";
import { Posisi } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/next-auth";
import { catatLog } from "@/lib/activityLog";
import { posisiPresensi, type StatusAnggota } from "@/lib/presensiDp";

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
    select: { id: true, nama_tim: true, tipe_tim: true, gugurAt: true },
  });
}

// Registrasi kehadiran TIM di DP — langkah tersendiri, dilakukan panitia saat tim
// melapor datang. Kehadiran ANGGOTA baru bisa dicek setelah tim registrasi.
// Lawannya: tim tidak hadir/mundur = status gugur (actions/StatusTim.ts).
export async function registrasiTim(timId: string): Promise<Hasil> {
  const oleh = await requireStaf();
  if (typeof timId !== "string" || !timId) return { success: false, message: "Tim tidak ditemukan" };
  const tim = await timTerkonfirmasi(timId);
  if (!tim) return { success: false, message: "Tim tidak ditemukan atau pembayaran belum terkonfirmasi" };
  if (tim.gugurAt) return { success: false, message: "Tim ditandai mundur / tidak hadir — batalkan statusnya dulu" };
  try {
    const sudah = await prisma.presensiDP.findUnique({ where: { timId }, select: { id: true } });
    if (sudah) return { success: true };
    await prisma.presensiDP.create({ data: { timId, olehNama: oleh } });
    await catatLog("PRESENSI_DP_REGISTRASI_TIM", tim.nama_tim);
    segarkan();
    return { success: true };
  } catch (e: any) {
    if (e?.code === "P2002") return { success: true }; // dua petugas menekan bersamaan
    console.error("registrasiTim error:", e);
    return { success: false, message: "Gagal mencatat registrasi tim" };
  }
}

// Status satu anggota (Danton/pasukan) saat registrasi ulang di DP:
//  "SESUAI"      = hadir & sesuai foto/data pendaftaran;
//  "TIDAK_HADIR" = anggota ini tidak datang — tim TETAP ikut lomba (beda dengan
//                  tim tidak hadir, yang ditandai lewat status gugur tim);
//  null          = hapus tanda (kembali "belum dicek").
// Hanya setelah tim registrasi (registrasiTim) — kehadiran tim & anggota dibedakan.
export async function setStatusAnggota(timId: string, anggotaId: string, status: StatusAnggota): Promise<Hasil> {
  const oleh = await requireStaf();
  if (status !== null && status !== "SESUAI" && status !== "TIDAK_HADIR")
    return { success: false, message: "Status tidak valid" };
  const tim = await timTerkonfirmasi(timId);
  if (!tim) return { success: false, message: "Tim tidak ditemukan atau pembayaran belum terkonfirmasi" };
  if (tim.gugurAt) return { success: false, message: "Tim ditandai mundur / tidak hadir — batalkan statusnya dulu" };
  const anggota = await prisma.anggota.findFirst({ where: { id: anggotaId, timId }, select: { posisi: true, nama: true } });
  if (!anggota || !posisiPresensi(tim.tipe_tim).includes(anggota.posisi))
    return { success: false, message: "Anggota tidak ditemukan di tim ini" };

  try {
    if (status === null) {
      await prisma.presensiAnggota.deleteMany({ where: { anggotaId } });
    } else {
      const tidakHadir = status === "TIDAK_HADIR";
      const presensi = await prisma.presensiDP.findUnique({ where: { timId }, select: { id: true } });
      if (!presensi) return { success: false, message: "Registrasi kehadiran tim dulu, baru cek anggotanya" };
      await prisma.presensiAnggota.upsert({
        where: { anggotaId },
        create: { presensiId: presensi.id, anggotaId, olehNama: oleh, tidakHadir },
        update: { tidakHadir, olehNama: oleh },
      });
      if (tidakHadir) await catatLog("PRESENSI_DP_ANGGOTA_TIDAK_HADIR", `${tim.nama_tim}: ${anggota.posisi} ${anggota.nama}`);
    }
    segarkan();
    return { success: true };
  } catch (e) {
    console.error("setStatusAnggota error:", e);
    return { success: false, message: "Gagal menyimpan presensi" };
  }
}

// Centang semua Danton & pasukan yang belum dicentang.
export async function centangSemuaSesuai(timId: string): Promise<Hasil> {
  const oleh = await requireStaf();
  const tim = await timTerkonfirmasi(timId);
  if (!tim) return { success: false, message: "Tim tidak ditemukan atau pembayaran belum terkonfirmasi" };
  if (tim.gugurAt) return { success: false, message: "Tim ditandai mundur / tidak hadir — batalkan statusnya dulu" };
  try {
    const n = await prisma.$transaction(async (tx) => {
      const presensi = await tx.presensiDP.findUnique({ where: { timId }, select: { id: true } });
      if (!presensi) return null;
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
    if (n === null) return { success: false, message: "Registrasi kehadiran tim dulu, baru cek anggotanya" };
    await catatLog("PRESENSI_DP_CENTANG_SEMUA", `${tim.nama_tim}: ${n} anggota`);
    segarkan();
    return { success: true };
  } catch (e) {
    console.error("centangSemuaSesuai error:", e);
    return { success: false, message: "Gagal menyimpan presensi" };
  }
}

// Koreksi salah tim: batalkan registrasi tim beserta semua status anggotanya (kembali "Belum registrasi").
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
