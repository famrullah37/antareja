import prisma from "@/lib/prisma";

export async function findProdukPOS(opts: { hanyaAktif?: boolean } = {}) {
  return prisma.produkPOS.findMany({
    where: opts.hanyaAktif ? { aktif: true } : undefined,
    include: { varian: { orderBy: [{ urutan: "asc" }, { nama: "asc" }] } },
    orderBy: [{ urutan: "asc" }, { createdAt: "asc" }],
  });
}

export async function findTransaksiPOS(opts: { sejak?: Date; take?: number } = {}) {
  return prisma.transaksiPOS.findMany({
    where: opts.sejak ? { createdAt: { gte: opts.sejak } } : undefined,
    orderBy: { createdAt: "desc" },
    take: opts.take,
  });
}
