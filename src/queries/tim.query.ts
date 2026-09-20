import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { isUuid, parseNoUrutSlug, shortIdFromSlug } from "@/lib/timSlug";

export async function createTim(data: Prisma.TimCreateInput) {
  const createdTim = await prisma.tim.create({ data });
  return createdTim;
}

export async function findTims(where?: Prisma.TimWhereInput) {
  const tims = await prisma.tim.findMany({
    include: { anggotas: true, pembayaran: true, penilaian: true },
    where,
  });
  return tims;
}

export async function findTim(
  where: Prisma.TimWhereUniqueInput,
  include?: Prisma.TimInclude
) {
  const tim = await prisma.tim.findUnique({ where, include });
  return tim;
}

export async function findTimsByUser(userId: string, include?: Prisma.TimInclude) {
  return prisma.tim.findMany({
    where: { userId },
    include,
    orderBy: { updated_at: "desc" },
  });
}

// Dipakai untuk autocomplete "Asal Sekolah" di form pendaftaran — asal_sekolah
// cuma teks bebas, jadi PIC berbeda dari sekolah yang sama gampang mengetik
// nama yang beda-beda (typo/variasi) kalau tidak dibantu daftar nama yang
// sudah pernah dipakai.
export async function findDistinctAsalSekolah() {
  const rows = await prisma.tim.findMany({
    select: { asal_sekolah: true },
    distinct: ["asal_sekolah"],
    orderBy: { asal_sekolah: "asc" },
  });
  return rows.map((r) => r.asal_sekolah);
}

export async function updateTim(
  where: Prisma.TimWhereUniqueInput,
  data: Prisma.TimUncheckedUpdateInput
) {
  const updatedTim = prisma.tim.update({ where, data });
  return updatedTim;
}

export async function deleteTim(where: Prisma.TimWhereUniqueInput) {
  const deletedTim = await prisma.tim.delete({ where });
  return deletedTim;
}

// Param URL admin bisa UUID (link/bookmark lama) atau slug "nama-tim-<8 hex id>".
// Slug ambigu (dua tim berawalan id sama) dianggap tidak ditemukan, bukan ditebak.
export async function findTimByParam(param: string) {
  if (isUuid(param)) return prisma.tim.findUnique({ where: { id: param } });
  const short = shortIdFromSlug(param);
  if (!short) return prisma.tim.findUnique({ where: { id: param } });
  const found = await prisma.tim.findMany({ where: { id: { startsWith: short } }, take: 2 });
  return found.length === 1 ? found[0] : null;
}

// Param URL halaman input nilai: UUID (lama), "sma-03" (jenjang-no.urut), atau "tim-<8 hex id>".
export async function findTimByNoUrutParam(param: string) {
  if (isUuid(param)) return prisma.tim.findUnique({ where: { id: param } });
  const parsed = parseNoUrutSlug(param);
  if (parsed) {
    return prisma.tim.findFirst({
      where: { jenjang: parsed.jenjang as Prisma.TimWhereInput["jenjang"], noUrut: parsed.noUrut },
    });
  }
  const short = shortIdFromSlug(param);
  if (!short) return prisma.tim.findUnique({ where: { id: param } });
  const found = await prisma.tim.findMany({ where: { id: { startsWith: short } }, take: 2 });
  return found.length === 1 ? found[0] : null;
}
