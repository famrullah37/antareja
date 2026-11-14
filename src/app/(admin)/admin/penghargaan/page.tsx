export const dynamic = "force-dynamic";
import { findKonfigJuaras } from "@/queries/penghargaan.query";
import { hitungRankingJuara } from "@/lib/juaraPerJenjang";
import { findKategoriLombas, findPenilaianBarus } from "@/queries/penilaianBaru.query";
import { H1 } from "@/app/components/global/Text";
import KonfigJuaraUmumForm from "./components/KonfigJuaraUmumForm";
import KonfigJuaraPeringkatForm from "./components/KonfigJuaraPeringkatForm";
import KonfigJuaraTable from "./components/KonfigJuaraTable";
import RankingJuaraSection from "./components/RankingJuaraSection";
import RankingTimSection from "./components/RankingTimSection";
import { hitungKelengkapanNilai, ringkasKosong } from "@/lib/kelengkapanNilai";
import { KATEGORI_PENENTU_SERI } from "@/lib/rankingNilai";

export default async function PenghargaanPage() {
  const [konfigs, kategoriLombas, penilaians, kelengkapan] = await Promise.all([
    findKonfigJuaras(),
    findKategoriLombas(),
    findPenilaianBarus(),
    hitungKelengkapanNilai(),
  ]);

  const { adaKategoriPBB, rankingData: dasar } = await hitungRankingJuara(konfigs, kategoriLombas, penilaians as any);
  // Tim jenjang ini yang nilainya masih ada yang kosong / belum dinilai sama
  // sekali → juara belum bisa dianggap final.
  const rankingData = dasar.map((d) => ({
    ...d,
    belumLengkap: Object.values(kelengkapan)
      .filter((k) => k.jenjang === d.jenjang && k.kosong > 0)
      .map((k) => `${k.namaTim} (${k.terisi === 0 ? "belum dinilai" : ringkasKosong(k)})`),
  }));

  return (
    <div className="flex flex-col gap-10">
      <H1>Penghargaan</H1>

      <RankingTimSection penilaians={penilaians as any} />

      <div className="border-t border-neutral-200 pt-8 flex flex-col gap-6">
        <h2 className="text-xl font-semibold">Konfigurasi Juara</h2>
        <div className="grid lg:grid-cols-2 gap-6">
          <KonfigJuaraUmumForm kategoris={kategoriLombas} />
          <KonfigJuaraPeringkatForm kategoris={kategoriLombas} konfigs={konfigs as any} />
        </div>
        <KonfigJuaraTable konfigs={konfigs} />
      </div>

      {!adaKategoriPBB && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl px-4 py-3 text-sm">
          ⚠ Tidak ada kategori bernama <b>{KATEGORI_PENENTU_SERI}</b>. Penentu nilai seri (juklak: nilai PBB) tidak
          berlaku — semua tim bernilai sama akan ditandai SERI. Pastikan kategori PBB dinamai persis &quot;PBB&quot;
          di Konfigurasi Penilaian.
        </div>
      )}

      <RankingJuaraSection rankingData={rankingData} konfigs={konfigs} />
    </div>
  );
}
