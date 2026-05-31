"use client";

type NilaiJuri = {
  id: string;
  subKategori: { kategori: string };
  nilaiDipilih: number;
  predikat: string;
};

type PenilaianBaru = {
  id: string;
  timId: string;
  nilaiKotor: number;
  totalPengurang: number;
  nilaiAkhir: number;
  tim: {
    nama_tim: string;
    asal_sekolah: string;
    jenjang: string;
  };
  nilaiJuri: NilaiJuri[];
};

export default function RankingTimSection({
  penilaians,
}: {
  penilaians: PenilaianBaru[];
}) {
  if (penilaians.length === 0) return null;

  const jenjangMap = new Map<string, PenilaianBaru[]>();
  for (const p of penilaians) {
    const j = p.tim.jenjang;
    if (!jenjangMap.has(j)) jenjangMap.set(j, []);
    jenjangMap.get(j)!.push(p);
  }

  const jenjangList = [...jenjangMap.keys()].sort();
  for (const j of jenjangList) {
    jenjangMap.get(j)!.sort((a, b) => b.nilaiAkhir - a.nilaiAkhir);
  }

  const rankColor = (idx: number) =>
    idx === 0
      ? "text-yellow-500"
      : idx === 1
      ? "text-gray-400"
      : idx === 2
      ? "text-orange-400"
      : "text-gray-300";

  const rowBg = (idx: number) =>
    idx === 0
      ? "bg-yellow-50"
      : idx === 1
      ? "bg-neutral-50"
      : idx === 2
      ? "bg-orange-50"
      : "bg-white";

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-xl font-semibold">Ranking Tim</h2>
      {jenjangList.map((jenjang) => {
        const ranked = jenjangMap.get(jenjang)!;
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {ranked.map((p, idx) => (
                    <tr key={p.id} className={rowBg(idx)}>
                      <td className="px-4 py-3">
                        <span className={`font-bold text-lg ${rankColor(idx)}`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.tim.nama_tim}</div>
                        <div className="text-xs text-gray-400">
                          {p.tim.asal_sekolah}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">{p.nilaiKotor}</td>
                      <td className="px-4 py-3 text-right text-red-400">
                        -{p.totalPengurang}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-lg">
                        {p.nilaiAkhir}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
