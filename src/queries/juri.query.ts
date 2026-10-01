import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function findJuris(where?: Prisma.JuriWhereInput) {
  return prisma.juri.findMany({ where });
}

// Kategori juri diambil dari penugasan (JuriKategori); kolom lama `kategori`
// hanya dipakai sebagai fallback kalau juri belum punya penugasan.
export async function findJurisWithKategori() {
  const juris = await prisma.juri.findMany({
    include: { juriKategori: { orderBy: { kategori: "asc" } } },
  });
  return juris.map(({ juriKategori, ...j }) => ({
    ...j,
    kategori: juriKategori.map((k) => k.kategori).join(", ") || j.kategori,
  }));
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
