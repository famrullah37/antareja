export const dynamic = "force-dynamic";
import { getLaporanKas } from "@/queries/kas.query";
import { H1 } from "@/app/components/global/Text";
import LaporanKasClient from "./LaporanKasClient";

export default async function KasPage() {
  const data = await getLaporanKas();

  return (
    <div className="flex flex-col gap-8">
      <H1>Laporan Kas & Transaksi</H1>
      <LaporanKasClient data={data as any} />
    </div>
  );
}
