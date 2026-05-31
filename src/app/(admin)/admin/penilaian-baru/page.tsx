export const dynamic = "force-dynamic";
import {
  findNilaiDiskritMasters,
  findPelanggarans,
  findSubKategoriMasters,
  findJuriKategoris,
  findKategoriLombas,
} from "@/queries/penilaianBaru.query";
import { findJuris } from "@/queries/juri.query";
import { H1 } from "@/app/components/global/Text";
import MasterNilaiDiskritSection from "./components/MasterNilaiDiskritSection";
import SubKategoriSection from "./components/SubKategoriSection";
import PelanggaranSection from "./components/PelanggaranSection";
import JuriKategoriSection from "./components/JuriKategoriSection";
import KategoriLombaSection from "./components/KategoriLombaSection";

export default async function PenilaianBaruPage() {
  const [nilaiMasters, subKategoris, pelanggarans, juris, juriKategoris, kategoriLombas] =
    await Promise.all([
      findNilaiDiskritMasters(),
      findSubKategoriMasters(),
      findPelanggarans(),
      findJuris(),
      findJuriKategoris(),
      findKategoriLombas(),
    ]);

  return (
    <div className="flex flex-col gap-10">
      <H1>Konfigurasi Penilaian</H1>

      <KategoriLombaSection kategoris={kategoriLombas} />

      <JuriKategoriSection juris={juris} juriKategoris={juriKategoris} kategoris={kategoriLombas} />

      <MasterNilaiDiskritSection masters={nilaiMasters} kategoris={kategoriLombas} />

      <SubKategoriSection subKategoris={subKategoris} kategoris={kategoriLombas} />

      <PelanggaranSection pelanggarans={pelanggarans} />
    </div>
  );
}
