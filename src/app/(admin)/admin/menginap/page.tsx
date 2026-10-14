export const dynamic = "force-dynamic";

import { H1 } from "@/app/components/global/Text";
import { getKonfigUmum } from "@/queries/konfigUmum.query";
import { findPengajuanMenginapAdmin } from "@/queries/menginap.query";
import PengaturanMenginap from "./components/PengaturanMenginap";
import DaftarMenginap from "./components/DaftarMenginap";

export default async function MenginapPage() {
  const [pengajuan, konfig] = await Promise.all([findPengajuanMenginapAdmin(), getKonfigUmum()]);

  // Rekap hanya dari yang disetujui — itu yang benar-benar perlu disiapkan tempatnya.
  const disetujui = pengajuan.filter((p) => p.status === "DISETUJUI");
  const total = (k: "jumlahPutra" | "jumlahPutri" | "jumlahPendamping") =>
    disetujui.reduce((s, p) => s + p[k], 0);
  const menunggu = pengajuan.filter((p) => p.status === "PENDING").length;

  return (
    <div className="py-6 flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <H1>Pengajuan Menginap</H1>
        <p className="text-sm text-gray-500">
          {pengajuan.length} pengajuan · {menunggu} menunggu persetujuan · {disetujui.length} disetujui (
          {total("jumlahPutra")} putra, {total("jumlahPutri")} putri, {total("jumlahPendamping")} pendamping)
        </p>
      </div>
      <PengaturanMenginap aktif={konfig.menginapAktif} info={konfig.menginapInfo} />
      <DaftarMenginap pengajuan={pengajuan} />
    </div>
  );
}
