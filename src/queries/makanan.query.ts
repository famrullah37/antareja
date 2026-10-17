import prisma from "@/lib/prisma";

const urutMenu = [{ urutan: "asc" as const }, { createdAt: "asc" as const }];

// Admin: semua sesi + semua menu (termasuk nonaktif).
export async function findSesiMakanAdmin() {
  return prisma.sesiMakan.findMany({
    orderBy: { waktu: "asc" },
    include: { menus: { orderBy: urutMenu }, _count: { select: { pesanan: true } } },
  });
}

// Dashboard tim: sesi aktif + menu aktif saja.
export async function findSesiMakanTim() {
  return prisma.sesiMakan.findMany({
    where: { aktif: true },
    orderBy: { waktu: "asc" },
    include: { menus: { where: { aktif: true }, orderBy: urutMenu } },
  });
}

export async function findPesananMakananByTim(timId: string) {
  return prisma.pesananMakanan.findMany({
    where: { timId },
    orderBy: { createdAt: "desc" },
    include: { sesi: { select: { nama: true, waktu: true } } },
  });
}

export async function findPesananMakananAdmin() {
  return prisma.pesananMakanan.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      sesi: { select: { id: true, nama: true, waktu: true } },
      tim: { select: { nama_tim: true, asal_sekolah: true, jenjang: true, no_pelatih: true } },
    },
  });
}
