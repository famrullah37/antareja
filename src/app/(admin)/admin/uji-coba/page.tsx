export const dynamic = "force-dynamic";

import { H1 } from "@/app/components/global/Text";
import { getKonfigUmum } from "@/queries/konfigUmum.query";
import { findSesiUjiCobaAdmin, findTimBolehUjiCoba } from "@/queries/ujiCoba.query";
import PengaturanUjiCoba from "./components/PengaturanUjiCoba";
import JadwalUjiCoba from "./components/JadwalUjiCoba";

export default async function UjiCobaPage() {
  const [sesi, timBoleh, konfig] = await Promise.all([
    findSesiUjiCobaAdmin(),
    findTimBolehUjiCoba(),
    getKonfigUmum(),
  ]);

  const belumPilih = timBoleh.filter((t) => !t.ujiCoba);

  return (
    <div className="py-6 flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <H1>Uji Coba Lapangan</H1>
        <p className="text-sm text-gray-500">
          {timBoleh.length - belumPilih.length} dari {timBoleh.length} tim (pembayaran terverifikasi) sudah
          memilih slot.
        </p>
      </div>
      <PengaturanUjiCoba batas={konfig.ujiCobaBatas} />
      <JadwalUjiCoba sesi={sesi} belumPilih={belumPilih} />
    </div>
  );
}
