"use client";

import { labelSeri, statusSeri } from "@/lib/rankingNilai";

type RankingItem = {
  timId: string;
  nama: string;
  sekolah: string;
  nilaiKotor: number;
  totalPengurang: number;
  nilaiAkhir: number;
  nilaiPBB: number;
};

type KonfigJuara = {
  id: string;
  jenisJuara: string;
  namaJuara: string;
  jenjang: string;
  urutan: number | null;
  kategoriList: unknown;
  dikunci: boolean;
};

export default function RankingJuaraSection({
  rankingData,
  konfigs,
}: {
  // ranking = urutan total semua kategori (dasar predikat peringkat/Juara Utama).
  // juaraUmum = peringkat 1 menurut kategori Juara Umum — bisa tim yang berbeda
  // dari Juara Utama 1 kalau kategorinya dibatasi (kategoriUmum != null).
  rankingData: {
    jenjang: string;
    ranking: RankingItem[];
    juaraUmum: RankingItem | null;
    juaraUmumSeri: boolean;
    kategoriUmum: string[] | null;
    belumLengkap: string[]; // tim dengan nilai juri kosong (kosong ≠ 0)
  }[];
  konfigs: KonfigJuara[];
}) {
  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-xl font-semibold">Ranking Otomatis</h2>
      {rankingData.map(({ jenjang, ranking, juaraUmum, juaraUmumSeri, kategoriUmum, belumLengkap }) => {
        if (ranking.length === 0) return null;

        const peringkatKonfigs = konfigs
          .filter((k) => k.jenisJuara === "PERINGKAT" && k.jenjang === jenjang)
          .sort((a, b) => (a.urutan ?? 99) - (b.urutan ?? 99));

        return (
          <div key={jenjang}>
            <h3 className="font-semibold text-base mb-1 text-neutral-600">
              Jenjang {jenjang}
            </h3>
            <p className="text-xs text-gray-500 mb-2">
              Urutan & predikat peringkat: total semua kategori (nilai sama → PBB lebih tinggi di atas). Juara Umum:{" "}
              {kategoriUmum ? (
                <>
                  hanya kategori <b>{kategoriUmum.join(", ")}</b>
                  {juaraUmum && ` (nilai ${juaraUmum.nilaiAkhir})`}
                </>
              ) : (
                "total semua kategori"
              )}
              .
            </p>
            {juaraUmumSeri && (
              <div className="bg-red-50 border border-red-300 text-red-800 rounded-lg px-3 py-2 text-xs mb-2">
                <b>⚠ Juara Umum {jenjang} SERI</b> — peringkat 1 dan 2 menurut kategori Juara Umum punya nilai dan
                nilai PBB yang sama. Lencana Juara Umum di tabel hanya sementara, putuskan sesuai juklak.
              </div>
            )}
            {belumLengkap.length > 0 && (
              <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-lg px-3 py-2 text-xs mb-2">
                <b>⚠ Juara jenjang {jenjang} BELUM FINAL</b> — {belumLengkap.length} tim masih punya nilai kosong
                (dihitung 0): {belumLengkap.join("; ")}.
              </div>
            )}
            <div className="overflow-x-auto rounded-xl border border-neutral-200">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left w-10">#</th>
                    <th className="px-4 py-3 text-left">Tim</th>
                    <th className="px-4 py-3 text-right">Nilai Kotor</th>
                    <th className="px-4 py-3 text-right">Pengurang</th>
                    <th className="px-4 py-3 text-right font-bold">Nilai Akhir</th>
                    <th className="px-4 py-3 text-right" title="Penentu bila nilai akhir sama">PBB</th>
                    <th className="px-4 py-3 text-left">Predikat Juara</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {ranking.map((tim, idx) => {
                    const juara = peringkatKonfigs[idx];
                    const isJuaraUmum = juaraUmum?.timId === tim.timId;

                    return (
                      <tr
                        key={tim.timId}
                        className={`${
                          idx === 0
                            ? "bg-yellow-50"
                            : idx === 1
                            ? "bg-neutral-50"
                            : idx === 2
                            ? "bg-orange-50"
                            : "bg-white"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span
                            className={`font-bold text-lg ${
                              idx === 0
                                ? "text-yellow-500"
                                : idx === 1
                                ? "text-gray-400"
                                : idx === 2
                                ? "text-orange-400"
                                : "text-gray-300"
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{tim.nama}</div>
                          <div className="text-xs text-gray-400">{tim.sekolah}</div>
                        </td>
                        <td className="px-4 py-3 text-right">{tim.nilaiKotor}</td>
                        <td className="px-4 py-3 text-right text-red-400">
                          -{tim.totalPengurang}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-lg">
                          {tim.nilaiAkhir}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">{tim.nilaiPBB}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            {labelSeri(statusSeri(ranking, idx)) && (
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${
                                  statusSeri(ranking, idx).seri
                                    ? "bg-red-100 text-red-700"
                                    : "bg-neutral-100 text-neutral-600"
                                }`}
                              >
                                {labelSeri(statusSeri(ranking, idx))}
                              </span>
                            )}
                            {isJuaraUmum && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium w-fit">
                                🏆 Juara Umum {jenjang}
                              </span>
                            )}
                            {juara && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium w-fit">
                                {juara.namaJuara}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
