"use client";

type PenilaianEntry = {
  id: string;
  nilaiAkhir: number;
  nilaiKotor: number;
  totalPengurang: number;
  published: boolean;
  tim: { nama_tim: string; asal_sekolah: string; jenjang: string };
};

const JENJANG_COLORS: Record<string, string> = {
  SD: "bg-blue-100 text-blue-700",
  SMP: "bg-green-100 text-green-700",
  SMA: "bg-purple-100 text-purple-700",
};

export default function RankingPreview({ rankings }: { rankings: PenilaianEntry[] }) {
  if (rankings.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center text-gray-400 text-sm">
        Belum ada hasil penilaian yang dipublish
      </div>
    );
  }

  const byJenjang: Record<string, PenilaianEntry[]> = {};
  for (const r of rankings) {
    const j = r.tim.jenjang;
    if (!byJenjang[j]) byJenjang[j] = [];
    byJenjang[j].push(r);
  }

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(byJenjang).map(([jenjang, rows]) => (
        <div key={jenjang} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-3 bg-neutral-50 border-b border-neutral-100 flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${JENJANG_COLORS[jenjang] ?? "bg-neutral-100 text-neutral-600"}`}>
              {jenjang}
            </span>
            <span className="font-semibold text-sm">Ranking {jenjang}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400 bg-neutral-50 border-b border-neutral-100">
                <tr>
                  <th className="px-4 py-2 text-center w-12">Rank</th>
                  <th className="px-4 py-2 text-left">Nama Tim</th>
                  <th className="px-4 py-2 text-left">Asal Sekolah</th>
                  <th className="px-4 py-2 text-right">Nilai Kotor</th>
                  <th className="px-4 py-2 text-right">Pengurang</th>
                  <th className="px-4 py-2 text-right">Nilai Akhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {rows
                  .sort((a, b) => b.nilaiAkhir - a.nilaiAkhir)
                  .map((row, i) => (
                    <tr key={row.id} className={`hover:bg-neutral-50 ${i === 0 ? "bg-yellow-50" : i === 1 ? "bg-gray-50" : i === 2 ? "bg-orange-50" : ""}`}>
                      <td className="px-4 py-2.5 text-center font-bold">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                      </td>
                      <td className="px-4 py-2.5 font-semibold">{row.tim.nama_tim}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{row.tim.asal_sekolah}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{row.nilaiKotor}</td>
                      <td className="px-4 py-2.5 text-right text-red-500">-{row.totalPengurang}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-primary-600 text-base">{row.nilaiAkhir}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
