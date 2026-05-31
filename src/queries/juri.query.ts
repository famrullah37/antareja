import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function findJuris(where?: Prisma.JuriWhereInput) {
  return prisma.juri.findMany({ where });
}

export async function findJuri(where: Prisma.JuriWhereUniqueInput) {
  return prisma.juri.findUnique({ where });
}

export async function createJuri(data: Prisma.JuriCreateInput) {
  return prisma.juri.create({ data });
}

export async function updateJuri(
  where: Prisma.JuriWhereUniqueInput,
  data: Prisma.JuriUpdateInput
) {
  return prisma.juri.update({ where, data });
}

export async function deleteJuri(where: Prisma.JuriWhereUniqueInput) {
  return prisma.juri.delete({ where });
}
