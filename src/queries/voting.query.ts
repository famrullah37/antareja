import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function findKonfigVoting() {
  return prisma.konfigVoting.findUnique({ where: { id: "singleton" } });
}

export async function upsertKonfigVoting(data: {
  aktif?: boolean;
  nominalVote?: number;
  qrisUrl?: string;
  qrisPayload?: string | null;
  bankNama?: string;
  bankNoRek?: string;
  bankAtasNama?: string;
}) {
  return prisma.konfigVoting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });
}

export async function findTimsForVoting() {
  return prisma.tim.findMany({
    where: { confirmed: true },
    select: {
      id: true,
      nama_tim: true,
      asal_sekolah: true,
      jenjang: true,
      totalVote: true,
    },
    orderBy: { totalVote: "desc" },
  });
}

export async function findTransaksiVotings(where?: Prisma.TransaksiVotingWhereInput) {
  return prisma.transaksiVoting.findMany({
    where,
    include: { tim: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function findTransaksiVoting(where: Prisma.TransaksiVotingWhereUniqueInput) {
  return prisma.transaksiVoting.findUnique({
    where,
    include: { tim: true },
  });
}

export async function createTransaksiVoting(data: Prisma.TransaksiVotingCreateInput) {
  return prisma.transaksiVoting.create({ data });
}

export async function updateTransaksiVoting(
  where: Prisma.TransaksiVotingWhereUniqueInput,
  data: Prisma.TransaksiVotingUpdateInput
) {
  return prisma.transaksiVoting.update({ where, data });
}
