export const dynamic = "force-dynamic";
import { findAlbums, findTransaksiFotos } from "@/queries/galeri.query";
import { H1 } from "@/app/components/global/Text";
import AlbumSection from "./components/AlbumSection";
import UploadFotoSection from "./components/UploadFotoSection";
import TransaksiFotoTable from "./components/TransaksiFotoTable";

export default async function AdminGaleriPage() {
  const [albums, transaksis] = await Promise.all([
    findAlbums(),
    findTransaksiFotos(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <H1>Manajemen Galeri Foto</H1>
      <AlbumSection albums={albums as any} />
      <UploadFotoSection albums={albums as any} />
      <div>
        <h2 className="text-xl font-semibold mb-3">Transaksi Pembelian Foto</h2>
        <TransaksiFotoTable transaksis={transaksis as any} />
      </div>
    </div>
  );
}
