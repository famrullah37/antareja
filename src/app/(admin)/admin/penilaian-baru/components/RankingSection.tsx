"use client";

import { publishNilaiBaru } from "@/actions/PenilaianBaru";
import { toast } from "sonner";

type NilaiJuriItem = {
  nilaiDipilih: number;
  predikat: string;
  subKategori: { kategori: string; kode: string };
  juri: { nama: string };
};

type PelanggaranTimItem = {
  id: string;
  jumlahKejadian: number;
  totalPengurang: number;
  pelanggaran: { kode: string; nama: string };
};

type PenilaianBaruItem = {
  id: string;
  timId: string;
  nilaiKotor: number;
  totalPengurang: number;
  nilaiAkhir: number;
  published: boolean;
  status: string;
  tim: { nama_tim: string; asal_sekolah: string; jenjang: string };
  nilaiJuri: NilaiJuriItem[];
  pelanggaranTim: PelanggaranTimItem[];
};

const JENJANG_ORDER = ["SD", "SMP", "SMA"];

export default function RankingSection({
  penilaians,
}: {
  penilaians: PenilaianBaruItem[];
}) {
  async function handlePublish(id: string, current: boolean) {
    const toastId = toast.loading(current ? "Menyembunyikan..." : "Mempublish...");
    const result = await publishNilaiBaru(id, !current);
    if (result.success)
      toast.success(current ? "Nilai disembunyikan" : "Nilai dipublish!", { id: toastId });
    else toast.error("Gagal", { id: toastId });
  }

  if (penilaians.length === 0) {
    return (
      <section>
        <h2 className="text-xl font-semibold mb-3">Ranking Tim</h2>
        <p className="text-gray-400 text-sm">Belum ada data penilaian.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">Ranking Tim</h2>
      {JENJANG_ORDER.map((jenjang) => {
        const grouped = penilaians
          .filter((p) => p.tim.jenjang === jenjang)
          .sort((a, b) => b.nilaiAkhir - a.nilaiAkhir);

        if (grouped.length === 0) return null;

        return (
          <div key={jenjang} className="mb-6">
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
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Publish</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {grouped.map((p, idx) => (
                    <tr key={p.id} className="bg-white">
                      <td className="px-4 py-3 font-bold text-gray-400">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.tim.nama_tim}</div>
                        <div className="text-xs text-gray-400">{p.tim.asal_sekolah}</div>
                      </td>
                      <td className="px-4 py-3 text-right">{p.nilaiKotor}</td>
                      <td className="px-4 py-3 text-right text-red-500">
                        -{p.totalPengurang}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-lg">
                        {p.nilaiAkhir}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            p.status === "FINAL"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handlePublish(p.id, p.published)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                            p.published
                              ? "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                              : "bg-primary-500 text-white hover:bg-primary-600"
                          }`}
                        >
                          {p.published ? "Sembunyikan" : "Publish"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </section>
  );
}
