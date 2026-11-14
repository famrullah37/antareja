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
import { KATEGORI_PENENTU_SERI, statusSeri } from "@/lib/rankingNilai";

export default async function PenghargaanPage() {
  const [konfigs, kategoriLombas, penilaians, kelengkapan] = await Promise.all([
    findKonfigJuaras(),
    findKategoriLombas(),
    findPenilaianBarus(),
    hitungKelengkapanNilai(),
  ]);

  const kategoriNames = kategoriLombas.map((k) => k.nama);
  // Kategori yang benar-benar dipakai: master + yang muncul di nilai juri (sub-kategori
  // bisa memakai kategori yang tidak/belum ada di master).
  const kategoriDipakai = new Set(
    [
      ...kategoriNames,
      ...(penilaians as any[]).flatMap((p) => p.nilaiJuri.map((n: any) => n.subKategori.kategori as string)),
    ].map((k) => k.trim().toLowerCase())
  );
  const adaKategoriPBB = kategoriDipakai.has(KATEGORI_PENENTU_SERI.toLowerCase());

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
      const dicentang = new Set(kategoriUmum.map((k) => k.trim().toLowerCase()));
      const semuaDicentang =
        kategoriUmum.length === 0 || Array.from(kategoriDipakai).every((k) => dicentang.has(k));
      const [ranking, rankingUmum] = await Promise.all([
        getRankingPerJenjang(j as any, []),
        semuaDicentang ? null : getRankingPerJenjang(j as any, kategoriUmum),
      ]);
      // Tim jenjang ini yang nilainya masih ada yang kosong / belum dinilai sama
      // sekali → juara belum bisa dianggap final.
      const belumLengkap = Object.values(kelengkapan)
        .filter((k) => k.jenjang === j && k.kosong > 0)
        .map((k) => `${k.namaTim} (${k.terisi === 0 ? "belum dinilai" : ringkasKosong(k)})`);
      const daftarUmum = rankingUmum ?? ranking;
      return {
        jenjang: j,
        ranking,
        juaraUmum: daftarUmum[0] ?? null,
        // Peringkat 1 Juara Umum seri dengan peringkat 2 (nilai & PBB sama) → panitia memutuskan.
        juaraUmumSeri: daftarUmum.length > 1 && statusSeri(daftarUmum, 0).seri,
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
