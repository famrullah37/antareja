"use client";

type RankingItem = {
  timId: string;
  nama: string;
  sekolah: string;
  nilaiKotor: number;
  totalPengurang: number;
  nilaiAkhir: number;
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
  rankingData: { jenjang: string; ranking: RankingItem[] }[];
  konfigs: KonfigJuara[];
}) {
  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-xl font-semibold">Ranking Otomatis</h2>
      {rankingData.map(({ jenjang, ranking }) => {
        if (ranking.length === 0) return null;

        const peringkatKonfigs = konfigs
          .filter((k) => k.jenisJuara === "PERINGKAT" && k.jenjang === jenjang)
          .sort((a, b) => (a.urutan ?? 99) - (b.urutan ?? 99));

        return (
          <div key={jenjang}>
            <h3 className="font-semibold text-base mb-2 text-neutral-600">
              Jenjang {jenjang}
            </h3>
            <div className="overflow-x-auto rounded-xl border border-neutral-200">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left w-10">#</th>
                    <th className="px-4 py-3 text-left">Tim</th>
                    <th className="px-4 py-3 text-right">Nilai Kotor</th>
                    <th className="px-4 py-3 text-right">Pengurang</th>
                    <th className="px-4 py-3 text-right font-bold">Nilai Akhir</th>
                    <th className="px-4 py-3 text-left">Predikat Juara</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {ranking.map((tim, idx) => {
                    const juara = peringkatKonfigs[idx];
                    const isJuaraUmum = idx === 0;

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
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
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
