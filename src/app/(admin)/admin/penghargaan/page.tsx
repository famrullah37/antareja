export const dynamic = "force-dynamic";
import { findKonfigJuaras, getRankingPerJenjang } from "@/queries/penghargaan.query";
import { findKategoriLombas, findPenilaianBarus } from "@/queries/penilaianBaru.query";
import { H1 } from "@/app/components/global/Text";
import KonfigJuaraUmumForm from "./components/KonfigJuaraUmumForm";
import KonfigJuaraPeringkatForm from "./components/KonfigJuaraPeringkatForm";
import KonfigJuaraTable from "./components/KonfigJuaraTable";
import RankingJuaraSection from "./components/RankingJuaraSection";
import RankingTimSection from "./components/RankingTimSection";
import { hitungKelengkapanNilai, ringkasKosong } from "@/lib/kelengkapanNilai";

export default async function PenghargaanPage() {
  const [konfigs, kategoriLombas, penilaians, kelengkapan] = await Promise.all([
    findKonfigJuaras(),
    findKategoriLombas(),
    findPenilaianBarus(),
    hitungKelengkapanNilai(),
  ]);

  const kategoriNames = kategoriLombas.map((k) => k.nama);

  // Ambil semua jenjang unik dari tim yang sudah dinilai
  const jenjangList = [...new Set((penilaians as any[]).map((p) => p.tim.jenjang))].sort();

  const rankingData = await Promise.all(
    jenjangList.map(async (j) => {
      const umumKonfig = konfigs.find(
        (k: any) => k.jenisJuara === "UMUM" && k.jenjang === j
      );
      // Peringkat (Juara Utama, dst) = total semua kategori; Juara Umum = hanya
      // kategori yang dicentang di konfigurasinya. Semua kategori tercentang
      // (atau belum dikonfigurasi) sama dengan total.
      const kategoriUmum = umumKonfig ? (umumKonfig.kategoriList as string[]) : [];
      const semuaDicentang =
        kategoriUmum.length === 0 ||
        kategoriNames.every((n) => kategoriUmum.some((k) => k.toLowerCase() === n.toLowerCase()));
      const [ranking, rankingUmum] = await Promise.all([
        getRankingPerJenjang(j as any, []),
        semuaDicentang ? null : getRankingPerJenjang(j as any, kategoriUmum),
      ]);
      // Tim jenjang ini yang nilainya masih ada yang kosong / belum dinilai sama
      // sekali → juara belum bisa dianggap final.
      const belumLengkap = Object.values(kelengkapan)
        .filter((k) => k.jenjang === j && k.kosong > 0)
        .map((k) => `${k.namaTim} (${k.terisi === 0 ? "belum dinilai" : ringkasKosong(k)})`);
      return {
        jenjang: j,
        ranking,
        juaraUmum: (rankingUmum ?? ranking)[0] ?? null,
        kategoriUmum: semuaDicentang ? null : kategoriUmum,
        belumLengkap,
      };
    })
  );

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

      <RankingJuaraSection rankingData={rankingData} konfigs={konfigs} />
    </div>
  );
}
