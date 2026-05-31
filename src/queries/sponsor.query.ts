import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function findSponsors(where?: Prisma.SponsorWhereInput) {
  return prisma.sponsor.findMany({
    where,
    orderBy: [{ urutan: "asc" }, { nama: "asc" }],
  });
}

export async function createSponsor(data: Prisma.SponsorCreateInput) {
  return prisma.sponsor.create({ data });
}

export async function updateSponsor(
  where: Prisma.SponsorWhereUniqueInput,
  data: Prisma.SponsorUpdateInput
) {
  return prisma.sponsor.update({ where, data });
}

export async function deleteSponsor(where: Prisma.SponsorWhereUniqueInput) {
  return prisma.sponsor.delete({ where });
}
