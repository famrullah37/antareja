import "server-only";

import { getRankingPerJenjang } from "@/queries/penghargaan.query";
import { KATEGORI_PENENTU_SERI, statusSeri } from "@/lib/rankingNilai";

type KonfigJuara = { jenisJuara: string; jenjang: string | null; kategoriList: unknown };
type PenilaianRingkas = { tim: { jenjang: string }; nilaiJuri: { subKategori: { kategori: string } }[] };

// Ranking & Juara Umum per jenjang — dipakai /admin/penghargaan dan /admin/voucher
// (preset voucher juara) supaya keduanya selalu menunjuk tim yang sama.
// Peringkat (Juara Utama, dst) = total semua kategori; Juara Umum = hanya
// kategori yang dicentang di konfigurasinya. Semua kategori tercentang
// (atau belum dikonfigurasi) sama dengan total.
export async function hitungRankingJuara(
  konfigs: KonfigJuara[],
  kategoriLombas: { nama: string }[],
  penilaians: PenilaianRingkas[]
) {
  // Kategori yang benar-benar dipakai: master + yang muncul di nilai juri (sub-kategori
  // bisa memakai kategori yang tidak/belum ada di master).
  const kategoriDipakai = new Set(
    [
      ...kategoriLombas.map((k) => k.nama),
      ...penilaians.flatMap((p) => p.nilaiJuri.map((n) => n.subKategori.kategori)),
    ].map((k) => k.trim().toLowerCase())
  );
  const adaKategoriPBB = kategoriDipakai.has(KATEGORI_PENENTU_SERI.toLowerCase());
  const jenjangList = [...new Set(penilaians.map((p) => p.tim.jenjang))].sort();

  const rankingData = await Promise.all(
    jenjangList.map(async (j) => {
      const umumKonfig = konfigs.find((k) => k.jenisJuara === "UMUM" && k.jenjang === j);
      const kategoriUmum = umumKonfig ? (umumKonfig.kategoriList as string[]) : [];
      const dicentang = new Set(kategoriUmum.map((k) => k.trim().toLowerCase()));
      const semuaDicentang =
        kategoriUmum.length === 0 || Array.from(kategoriDipakai).every((k) => dicentang.has(k));
      const [ranking, rankingUmum] = await Promise.all([
        getRankingPerJenjang(j as any, []),
        semuaDicentang ? null : getRankingPerJenjang(j as any, kategoriUmum),
      ]);
      const daftarUmum = rankingUmum ?? ranking;
      return {
        jenjang: j,
        ranking,
        juaraUmum: daftarUmum[0] ?? null,
        // Peringkat 1 Juara Umum seri dengan peringkat 2 (nilai & PBB sama) → panitia memutuskan.
        juaraUmumSeri: daftarUmum.length > 1 && statusSeri(daftarUmum, 0).seri,
        // Peringkat 1 (Juara Utama 1) seri dengan peringkat 2.
        juaraUtamaSeri: ranking.length > 1 && statusSeri(ranking, 0).seri,
        kategoriUmum: semuaDicentang ? null : kategoriUmum,
      };
    })
  );

  return { adaKategoriPBB, rankingData };
}
