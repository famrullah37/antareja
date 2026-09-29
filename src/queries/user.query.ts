import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function createUser(data: Prisma.UserCreateInput) {
  const createdUser = await prisma.user.create({
    data,
  });
  return createdUser;
}

export async function findUsers(where?: Prisma.UserWhereInput) {
  const users = await prisma.user.findMany({ where });
  return users;
}

export async function findUser(where: Prisma.UserWhereUniqueInput) {
  const user = await prisma.user.findUnique({ where });
  return user;
}

// Email disimpan & dibandingkan tanpa beda huruf besar/kecil dan tanpa spasi
// di ujung — "Budi@Gmail.com " dan "budi@gmail.com" adalah akun yang sama.
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

// Cari user berdasarkan email secara case-insensitive (data lama mungkin
// tersimpan dengan huruf besar). Kalau kebetulan ada duplikat beda kapital
// dari sebelum perbaikan ini, akun yang sudah terverifikasi didahulukan.
export async function findUserByEmail(email: string, excludeId?: string) {
  return prisma.user.findFirst({
    where: {
      email: { equals: normalizeEmail(email), mode: "insensitive" },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    orderBy: { verified: "desc" },
  });
}

export async function updateUser(
  where: Prisma.UserWhereUniqueInput,
  data: Prisma.UserUncheckedUpdateInput
) {
  const updatedUser = await prisma.user.update({ where, data });
  return updatedUser;
}

export async function deleteUser(where: Prisma.UserWhereUniqueInput) {
  const deletedUser = await prisma.user.delete({ where });
  return deletedUser;
}
