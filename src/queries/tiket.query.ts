import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function findTikets(where?: Prisma.TiketWhereInput) {
  return prisma.tiket.findMany({ where });
}

export async function findTiket(where: Prisma.TiketWhereUniqueInput) {
  return prisma.tiket.findUnique({ where });
}

export async function createTiket(data: Prisma.TiketCreateInput) {
  return prisma.tiket.create({ data });
}

export async function updateTiket(
  where: Prisma.TiketWhereUniqueInput,
  data: Prisma.TiketUpdateInput
) {
  return prisma.tiket.update({ where, data });
}

export async function deleteTiket(where: Prisma.TiketWhereUniqueInput) {
  return prisma.tiket.delete({ where });
}

export async function findTransaksiTikets(
  where?: Prisma.TransaksiTiketWhereInput
) {
  return prisma.transaksiTiket.findMany({
    where,
    include: { tiket: true, user: true, qrTikets: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function findTransaksiTiket(
  where: Prisma.TransaksiTiketWhereUniqueInput
) {
  return prisma.transaksiTiket.findUnique({
    where,
    include: { tiket: true, qrTikets: true },
  });
}

export async function createTransaksiTiket(
  data: Prisma.TransaksiTiketCreateInput
) {
  return prisma.transaksiTiket.create({ data });
}

export async function updateTransaksiTiket(
  where: Prisma.TransaksiTiketWhereUniqueInput,
  data: Prisma.TransaksiTiketUpdateInput
) {
  return prisma.transaksiTiket.update({ where, data });
}

export async function findQRTiket(where: Prisma.QRTiketWhereUniqueInput) {
  return prisma.qRTiket.findUnique({
    where,
    include: { transaksi: { include: { tiket: true } } },
  });
}

export async function updateQRTiket(
  where: Prisma.QRTiketWhereUniqueInput,
  data: Prisma.QRTiketUpdateInput
) {
  return prisma.qRTiket.update({ where, data });
}

export async function findKonfigTiket() {
  return prisma.konfigTiket.findUnique({ where: { id: "singleton" } });
}

export async function upsertKonfigTiket(data: {
  qrisUrl?: string;
  qrisPayload?: string | null;
  bankNama?: string;
  bankNoRek?: string;
  bankAtasNama?: string;
}) {
  return prisma.konfigTiket.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });
}
