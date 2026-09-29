export const dynamic = "force-dynamic";
import { findTims } from "@/queries/tim.query";
import { getKonfigUmum } from "@/queries/konfigUmum.query";
import { H1 } from "@/app/components/global/Text";
import TimTable from "./components/Table";
import ExportDataTimButton from "./components/ExportDataTimButton";
import KuotaTimForm from "./components/KuotaTimForm";

export default async function Tim() {
  const [tims, konfig] = await Promise.all([findTims(), getKonfigUmum()]);

  const hitung = (jenjang: string) => ({
    terkonfirmasi: tims.filter((t) => t.jenjang === jenjang && t.confirmed).length,
    terdaftar: tims.filter((t) => t.jenjang === jenjang).length,
  });
  const baris = [
    { label: "SD", name: "kuotaSD" as const, kuota: konfig.kuotaSD, ...hitung("SD") },
    { label: "SMP", name: "kuotaSMP" as const, kuota: konfig.kuotaSMP, ...hitung("SMP") },
    { label: "SMA", name: "kuotaSMA" as const, kuota: konfig.kuotaSMA, ...hitung("SMA") },
    { label: "Purna", name: "kuotaPurna" as const, kuota: konfig.kuotaPurna, ...hitung("PURNA") },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <H1>Tim</H1>
        <ExportDataTimButton label="Unduh Data Semua Tim (Excel)" />
      </div>
      <div className="mt-4 max-w-3xl">
        <KuotaTimForm baris={baris} />
      </div>
      <div className="mt-4">
        <TimTable data={tims} />
      </div>
    </div>
  );
}
