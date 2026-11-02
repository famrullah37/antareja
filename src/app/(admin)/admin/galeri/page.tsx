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
  const [albums, transaksis, tanpaWatermark, fotografers, session] = await Promise.all([
    findAlbums(),
    findTransaksiFotos(),
    hitungFotoTanpaWatermark(),
    prisma.user.findMany({ where: { role: "FOTOGRAFER" }, select: { id: true, nama: true }, orderBy: { nama: "asc" } }),
    getServerSession(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <H1>Manajemen Galeri Foto</H1>
      <WatermarkFotoLama jumlah={tanpaWatermark} />
      <AlbumSection albums={albums as any} fotografers={fotografers} isAdmin={session?.user?.role === "ADMIN"} />
      <UploadFotoSection albums={albums as any} fotografers={fotografers} isAdmin={session?.user?.role === "ADMIN"} />
      <div>
        <h2 className="text-xl font-semibold mb-3">Transaksi Pembelian Foto</h2>
        <TransaksiFotoTable transaksis={transaksis as any} />
      </div>
    </div>
  );
}
