import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function findBeritas(where?: Prisma.BeritaWhereInput, take?: number) {
  return prisma.berita.findMany({
    where,
    take,
    orderBy: [{ publishedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
  });
}

export async function findBerita(where: Prisma.BeritaWhereUniqueInput) {
  return prisma.berita.findUnique({ where });
}

export async function createBerita(data: Prisma.BeritaCreateInput) {
  return prisma.berita.create({ data });
}

export async function updateBerita(
  where: Prisma.BeritaWhereUniqueInput,
  data: Prisma.BeritaUpdateInput
) {
  return prisma.berita.update({ where, data });
}

export async function deleteBerita(where: Prisma.BeritaWhereUniqueInput) {
  return prisma.berita.delete({ where });
}
