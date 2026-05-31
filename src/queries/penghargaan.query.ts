import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function findKonfigJuaras(where?: Prisma.KonfigJuaraWhereInput) {
  return prisma.konfigJuara.findMany({
    where,
    orderBy: [{ jenisJuara: "asc" }, { jenjang: "asc" }, { urutan: "asc" }],
  });
}

export async function findKonfigJuara(where: Prisma.KonfigJuaraWhereUniqueInput) {
  return prisma.konfigJuara.findUnique({ where });
}

export async function createKonfigJuara(data: Prisma.KonfigJuaraCreateInput) {
  return prisma.konfigJuara.create({ data });
}

export async function updateKonfigJuara(
  where: Prisma.KonfigJuaraWhereUniqueInput,
  data: Prisma.KonfigJuaraUpdateInput
) {
  return prisma.konfigJuara.update({ where, data });
}

export async function deleteKonfigJuara(where: Prisma.KonfigJuaraWhereUniqueInput) {
  return prisma.konfigJuara.delete({ where });
}

export async function getRankingPerJenjang(
  jenjang: "SD" | "SMP" | "SMA",
  _kategoriList: string[]
) {
  const penilaians = await prisma.penilaianBaru.findMany({
    where: { tim: { jenjang } },
    include: { tim: true },
    orderBy: { nilaiAkhir: "desc" },
  });

  return penilaians.map((p) => ({
    timId: p.timId,
    nama: p.tim.nama_tim,
    sekolah: p.tim.asal_sekolah,
    nilaiKotor: p.nilaiKotor,
    totalPengurang: p.totalPengurang,
    nilaiAkhir: p.nilaiAkhir,
  }));
}
