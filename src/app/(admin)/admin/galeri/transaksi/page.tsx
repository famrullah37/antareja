export const dynamic = "force-dynamic";
import { findTransaksiFotos } from "@/queries/galeri.query";
import { H1 } from "@/app/components/global/Text";
import TransaksiFotoTable from "../components/TransaksiFotoTable";

// Verifikasi pembelian foto untuk Admin & Bendahara — terpisah dari
// /admin/galeri supaya bendahara tidak ikut mendapat kelola album/upload foto.
export default async function TransaksiFotoPage() {
  const transaksis = await findTransaksiFotos();

  return (
    <div className="flex flex-col gap-6">
      <H1>Transaksi Pembelian Foto</H1>
      <TransaksiFotoTable transaksis={transaksis as any} />
    </div>
  );
}
