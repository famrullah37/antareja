import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function findSertifikats(where?: Prisma.SertifikatWhereInput) {
  return prisma.sertifikat.findMany({ where, include: { tim: true }, orderBy: { createdAt: "asc" } });
}

export async function findSertifikatByTim(timId: string) {
  return prisma.sertifikat.findMany({ where: { timId }, orderBy: { createdAt: "asc" } });
}

export async function createSertifikat(data: {
  timId: string;
  fileUrl: string;
  namaAnggota?: string | null;
  namaJuara?: string | null;
}) {
  return prisma.$executeRaw`
    INSERT INTO "Sertifikat" (id, "timId", "fileUrl", "namaAnggota", "namaJuara", "createdAt")
    VALUES (gen_random_uuid(), ${data.timId}, ${data.fileUrl}, ${data.namaAnggota ?? null}, ${data.namaJuara ?? null}, NOW())
  `;
}

export async function deleteSertifikatById(id: string) {
  return prisma.sertifikat.delete({ where: { id } });
}

export async function deleteSertifikatByTim(timId: string) {
  return prisma.sertifikat.deleteMany({ where: { timId } });
}
