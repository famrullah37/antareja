export const dynamic = "force-dynamic";
import { findAlbums, findTransaksiFotos } from "@/queries/galeri.query";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/next-auth";
import { hitungFotoTanpaWatermark } from "@/actions/Galeri";
import { H1 } from "@/app/components/global/Text";
import AlbumSection from "./components/AlbumSection";
import UploadFotoSection from "./components/UploadFotoSection";
import TransaksiFotoTable from "./components/TransaksiFotoTable";
import WatermarkFotoLama from "./components/WatermarkFotoLama";

export default async function AdminGaleriPage() {
  const [albums, transaksis, tanpaWatermark, fotografers, session, tims, gratisPerAlbum] = await Promise.all([
    findAlbums(),
    findTransaksiFotos(),
    hitungFotoTanpaWatermark(),
    prisma.user.findMany({ where: { role: "FOTOGRAFER" }, select: { id: true, nama: true }, orderBy: { nama: "asc" } }),
    getServerSession(),
    prisma.tim.findMany({ select: { id: true, nama_tim: true, asal_sekolah: true }, orderBy: { nama_tim: "asc" } }),
    // Foto yang ditandai gratis per album (album berbayar bisa berisi foto gratis).
    prisma.foto.groupBy({ by: ["albumId"], where: { gratis: true }, _count: { _all: true } }),
  ]);
  const jumlahGratis = Object.fromEntries(gratisPerAlbum.map((g) => [g.albumId, g._count._all]));
  const timOpsi = tims.map((t) => ({ id: t.id, nama: t.nama_tim, sekolah: t.asal_sekolah }));

  return (
    <div className="flex flex-col gap-10">
      <H1>Manajemen Galeri Foto</H1>
      <WatermarkFotoLama jumlah={tanpaWatermark} />
      <AlbumSection
        albums={albums as any}
        fotografers={fotografers}
        tims={timOpsi}
        isAdmin={session?.user?.role === "ADMIN"}
        userId={session?.user?.id ?? null}
        jumlahGratis={jumlahGratis}
      />
      <UploadFotoSection
        albums={albums as any}
        fotografers={fotografers}
        tims={timOpsi}
        isAdmin={session?.user?.role === "ADMIN"}
      />
      <div>
        <h2 className="text-xl font-semibold mb-3">Transaksi Pembelian Foto</h2>
        <TransaksiFotoTable transaksis={transaksis as any} />
      </div>
    </div>
  );
}
