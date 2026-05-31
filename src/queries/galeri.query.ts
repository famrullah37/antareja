import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ─── Album ────────────────────────────────────────────────────────────────────

export async function findAlbums(where?: Prisma.AlbumWhereInput) {
  return prisma.album.findMany({
    where,
    include: { _count: { select: { fotos: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function findAlbum(where: Prisma.AlbumWhereUniqueInput) {
  return prisma.album.findUnique({
    where,
    include: { fotos: true },
  });
}

export async function createAlbum(data: Prisma.AlbumCreateInput) {
  return prisma.album.create({ data });
}

export async function updateAlbum(
  where: Prisma.AlbumWhereUniqueInput,
  data: Prisma.AlbumUpdateInput
) {
  return prisma.album.update({ where, data });
}

export async function deleteAlbum(where: Prisma.AlbumWhereUniqueInput) {
  return prisma.album.delete({ where });
}

// ─── Foto ─────────────────────────────────────────────────────────────────────

export async function findFotos(where?: Prisma.FotoWhereInput) {
  return prisma.foto.findMany({
    where,
    include: { album: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createFoto(data: Prisma.FotoCreateInput) {
  return prisma.foto.create({ data });
}

export async function updateFoto(
  where: Prisma.FotoWhereUniqueInput,
  data: Prisma.FotoUpdateInput
) {
  return prisma.foto.update({ where, data });
}

export async function deleteFoto(where: Prisma.FotoWhereUniqueInput) {
  return prisma.foto.delete({ where });
}

// ─── Transaksi Foto ───────────────────────────────────────────────────────────

export async function findTransaksiFotos(
  where?: Prisma.TransaksiFotoWhereInput
) {
  return prisma.transaksiFoto.findMany({
    where,
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTransaksiFoto(
  data: Prisma.TransaksiFotoCreateInput
) {
  return prisma.transaksiFoto.create({ data });
}

export async function updateTransaksiFoto(
  where: Prisma.TransaksiFotoWhereUniqueInput,
  data: Prisma.TransaksiFotoUpdateInput
) {
  return prisma.transaksiFoto.update({ where, data });
}
