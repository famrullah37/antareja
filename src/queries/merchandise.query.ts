import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function findMerchandises(where?: Prisma.MerchandiseWhereInput) {
  return prisma.merchandise.findMany({
    where,
    orderBy: [{ urutan: "asc" }, { createdAt: "asc" }],
  });
}

export async function findKonfigMerch() {
  return prisma.konfigMerch.findUnique({ where: { id: "singleton" } });
}

export async function findPesananMerchs(where?: Prisma.PesananMerchWhereInput) {
  return prisma.pesananMerch.findMany({ where, orderBy: { createdAt: "desc" } });
}

export async function incrementCounterUrutMerch() {
  return prisma.konfigMerch.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", counterUrut: 1 },
    update: { counterUrut: { increment: 1 } },
  });
}
