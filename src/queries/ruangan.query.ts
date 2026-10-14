import prisma from "@/lib/prisma";

export async function findRuanganAdmin() {
  return prisma.ruangan.findMany({
    orderBy: { nama: "asc" },
    include: { _count: { select: { tims: true } } },
  });
}

// Semua tim untuk penempatan ruangan, beserta status menginap sebagai info.
export async function findTimPenempatan() {
  return prisma.tim.findMany({
    orderBy: [{ jenjang: "asc" }, { nama_tim: "asc" }],
    select: {
      id: true,
      nama_tim: true,
      asal_sekolah: true,
      jenjang: true,
      confirmed: true,
      ruanganId: true,
      menginap: { select: { status: true } },
    },
  });
}

// Untuk dashboard tim: ruangan tim + tim lain yang satu ruangan.
export async function findRuanganTim(ruanganId: string) {
  return prisma.ruangan.findUnique({
    where: { id: ruanganId },
    include: { tims: { orderBy: { nama_tim: "asc" }, select: { id: true, nama_tim: true, asal_sekolah: true } } },
  });
}

