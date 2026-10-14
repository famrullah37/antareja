import prisma from "@/lib/prisma";

export async function findPengajuanMenginapByTim(timId: string) {
  return prisma.pengajuanMenginap.findUnique({ where: { timId } });
}

// Untuk admin: PENDING dulu, lalu urut tanggal datang.
export async function findPengajuanMenginapAdmin() {
  const rows = await prisma.pengajuanMenginap.findMany({
    orderBy: [{ tanggalDatang: "asc" }, { createdAt: "asc" }],
    include: { tim: { select: { id: true, nama_tim: true, asal_sekolah: true, jenjang: true, ruangan: { select: { nama: true } } } } },
  });
  const urutan: Record<string, number> = { PENDING: 0, DISETUJUI: 1, DITOLAK: 2 };
  return rows.sort((a, b) => (urutan[a.status] ?? 9) - (urutan[b.status] ?? 9));
}
