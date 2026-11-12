export const dynamic = "force-dynamic";

import Link from "next/link";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/next-auth";
import { H1 } from "@/app/components/global/Text";
import FotoUploadClient from "./FotoUploadClient";

// Daftar foto yang sudah di-upload. Fotografer hanya melihat fotonya sendiri:
// foto dengan fotograferId = dia, atau foto tanpa fotografer di album miliknya
// (aturan pemilik yang sama dengan bagi hasil).
export default async function FotoUploadPage({ searchParams }: { searchParams: { album?: string } }) {
  const session = await getServerSession();
  const role = session?.user?.role;
  const isAdmin = role === "ADMIN";
  const milikSaya: Prisma.FotoWhereInput = isAdmin
    ? {}
    : {
        OR: [
          { fotograferId: session?.user?.id },
          { fotograferId: null, album: { fotograferId: session?.user?.id } },
        ],
      };

  const [fotos, transaksi] = await Promise.all([
    prisma.foto.findMany({
      where: milikSaya,
      include: {
        album: { select: { id: true, nama: true, tipe: true, harga: true, fotografer: { select: { nama: true } } } },
        fotografer: { select: { nama: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.transaksiFoto.findMany({ where: { status: "VERIFIED" }, select: { fotoList: true } }),
  ]);

  // Berapa kali tiap foto terjual (transaksi VERIFIED; fotoList = daftar id foto).
  const terjual = new Map<string, number>();
  for (const t of transaksi) {
    if (!Array.isArray(t.fotoList)) continue;
    for (const id of t.fotoList) if (typeof id === "string") terjual.set(id, (terjual.get(id) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/galeri" className="text-sm text-primary-600 hover:underline">
          ← Galeri
        </Link>
        <H1 className="mb-0">{isAdmin ? "Semua Foto Ter-upload" : "Foto Saya"}</H1>
        <p className="text-sm text-gray-500">
          {isAdmin ? "Semua foto dari semua fotografer." : "Foto yang Anda upload (dan foto di album milik Anda)."}
        </p>
      </div>
      <FotoUploadClient
        isAdmin={isAdmin}
        albumAwal={searchParams.album ?? ""}
        fotos={fotos.map((f) => ({
          id: f.id,
          url: f.pathWatermark || f.pathAsli,
          urlAsli: f.pathAsli,
          albumId: f.album.id,
          albumNama: f.album.nama,
          albumTipe: f.album.tipe,
          gratis: f.album.tipe === "GRATIS" || f.gratis,
          harga: f.album.harga,
          tim: f.tagTim,
          fotografer: f.fotografer?.nama ?? f.album.fotografer?.nama ?? null,
          terjual: terjual.get(f.id) ?? 0,
          createdAt: f.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
