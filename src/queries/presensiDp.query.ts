import prisma from "@/lib/prisma";
import { posisiPresensi, statusAnggota } from "@/lib/presensiDp";

// Daftar tim terkonfirmasi untuk halaman presensi DP + centang anggotanya.
export async function findTimPresensiDP() {
  const tims = await prisma.tim.findMany({
    where: { confirmed: true },
    orderBy: [{ jenjang: "asc" }, { noUrut: "asc" }, { nama_tim: "asc" }],
    select: {
      id: true,
      nama_tim: true,
      asal_sekolah: true,
      jenjang: true,
      tipe_tim: true,
      noUrut: true,
      gugurAt: true,
      gugurJenis: true,
      presensiDP: { select: { hadirAt: true } },
      anggotas: { select: { posisi: true, presensiDP: { select: { tidakHadir: true } } } },
    },
  });
  return tims.map((t) => {
    const wajib = new Set(posisiPresensi(t.tipe_tim));
    return {
      ...t,
      anggotas: t.anggotas
        .filter((a) => wajib.has(a.posisi))
        .map((a) => ({ posisi: a.posisi as string, status: statusAnggota(a.presensiDP) })),
    };
  });
}

// Detail satu tim: Danton & pasukan dengan data pembanding (foto, NISN, kelas, tgl lahir).
export async function findPresensiDPTim(timId: string) {
  const tim = await prisma.tim.findUnique({
    where: { id: timId },
    select: {
      id: true,
      nama_tim: true,
      asal_sekolah: true,
      jenjang: true,
      tipe_tim: true,
      noUrut: true,
      confirmed: true,
      foto: true,
      gugurAt: true,
      gugurJenis: true,
      gugurAlasan: true,
      gugurOleh: true,
      gugurTanpaVote: true,
      penilaianBaru: { select: { published: true } },
      presensiDP: { select: { hadirAt: true, olehNama: true } },
      anggotas: {
        select: {
          id: true,
          nama: true,
          foto: true,
          posisi: true,
          nisn: true,
          kelas: true,
          tanggal_lahir: true,
          presensiDP: { select: { olehNama: true, tidakHadir: true } },
        },
      },
    },
  });
  if (!tim) return null;
  const wajib = new Set(posisiPresensi(tim.tipe_tim));
  return { ...tim, anggotas: tim.anggotas.filter((a) => wajib.has(a.posisi)) };
}
