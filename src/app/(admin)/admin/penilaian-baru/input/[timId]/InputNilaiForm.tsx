"use client";

import { inputNilaiJuri, inputPelanggaranTim } from "@/actions/PenilaianBaru";
import { useState } from "react";
import { toast } from "sonner";

type SubKategori = {
  id: string;
  kode: string;
  nama: string;
  kategori: string;
  maxNilai: number;
};
type NilaiDiskrit = {
  id: string;
  kategori: string;
  predikat: string;
  warna: string;
  nilai: number[];
  urutan: number;
};
type Juri = { id: string; nama: string };
type JuriKat = { id: string; juriId: string; kategori: string; juri: Juri };
type Pelanggaran = { id: string; kode: string; nama: string; poinPengurangan: number };
type Tim = { id: string; nama_tim: string };
type Existing = {
  id: string;
  nilaiKotor: number;
  totalPengurang: number;
  nilaiAkhir: number;
  nilaiJuri: {
    subKategoriId: string;
    juriId: string;
    nilaiDipilih: number;
    predikat: string;
  }[];
} | null;

const PREDIKAT_COLORS: Record<string, string> = {
  SANGAT_BAGUS: "#22c55e",
  BAGUS: "#84cc16",
  CUKUP_BAGUS: "#eab308",
  CUKUP: "#f97316",
  KURANG: "#ef4444",
  SANGAT_KURANG: "#991b1b",
};

function getNilaiPredikat(nilai: number, masters: NilaiDiskrit[], kategori: string) {
  const filtered = masters.filter((m) => m.kategori.toLowerCase() === kategori.toLowerCase());
  for (const m of filtered) {
    if ((m.nilai as number[]).includes(nilai)) {
      return { predikat: m.predikat, warna: m.warna };
    }
  }
  return { predikat: "KURANG", warna: "#ef4444" };
}

export default function InputNilaiForm({
  tim,
  juris,
  subKategoris,
  nilaiMasters,
  pelanggarans,
  juriKategoris,
  existing,
}: {
  tim: Tim;
  juris: Juri[];
  subKategoris: SubKategori[];
  nilaiMasters: NilaiDiskrit[];
  pelanggarans: Pelanggaran[];
  juriKategoris: JuriKat[];
  existing: Existing;
}) {
  const [selectedJuriId, setSelectedJuriId] = useState<string>("");
  const [scores, setScores] = useState<
    Record<string, { nilai: number; predikat: string; catatan: string }>
  >({});
  const [loading, setLoading] = useState(false);

  const selectedJuriKats = juriKategoris.filter(
    (jk) => jk.juriId === selectedJuriId
  );
  const assignedKategoris = selectedJuriKats.map((jk) => jk.kategori.toLowerCase());
  const mySubKategoris = subKategoris.filter((s) =>
    assignedKategoris.includes(s.kategori.toLowerCase())
  );

  // Group sub-kategoris by kategori (normalized key → original label dari juriKat)
  const grouped = mySubKategoris.reduce<Record<string, SubKategori[]>>(
    (acc, sub) => {
      const key = selectedJuriKats.find(
        (jk) => jk.kategori.toLowerCase() === sub.kategori.toLowerCase()
      )?.kategori ?? sub.kategori;
      if (!acc[key]) acc[key] = [];
      acc[key].push(sub);
      return acc;
    },
    {}
  );

  function handleNilaiClick(subId: string, nilai: number, kategori: string) {
    const { predikat } = getNilaiPredikat(nilai, nilaiMasters, kategori);
    setScores((prev) => ({
      ...prev,
      [subId]: { nilai, predikat, catatan: prev[subId]?.catatan ?? "" },
    }));
  }

  async function handleSubmit() {
    if (!selectedJuriId) {
      toast.error("Pilih juri terlebih dahulu");
      return;
    }
    const entries = Object.entries(scores).map(([subKategoriId, v]) => ({
      subKategoriId,
      nilai: v.nilai,
      predikat: v.predikat,
      catatan: v.catatan || undefined,
    }));
    if (entries.length === 0) {
      toast.error("Belum ada nilai yang diinput");
      return;
    }
    setLoading(true);
    const toastId = toast.loading("Menyimpan nilai...");
    const result = await inputNilaiJuri(tim.id, entries);
    setLoading(false);
    if (result.success) {
      toast.success("Nilai berhasil disimpan & dihitung ulang!", { id: toastId });
    } else {
      toast.error("Gagal menyimpan nilai", { id: toastId });
    }
  }

  // Pelanggaran state
  const [pelId, setPelId] = useState("");
  const [kejadian, setKejadian] = useState(1);

  async function handleAddPelanggaran() {
    if (!pelId) return;
    const pel = pelanggarans.find((p) => p.id === pelId);
    if (!pel) return;
    const toastId = toast.loading("Menambah pelanggaran...");
    const result = await inputPelanggaranTim(
      tim.id,
      pelId,
      kejadian,
      pel.poinPengurangan
    );
    if (result.success) toast.success("Pelanggaran ditambahkan!", { id: toastId });
    else toast.error("Gagal", { id: toastId });
  }

  const totalScore = Object.values(scores).reduce((s, v) => s + v.nilai, 0);

  return (
    <div className="flex flex-col gap-8">
      {/* Ringkasan nilai akhir existing */}
      {existing && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 flex gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold">{existing.nilaiKotor}</div>
            <div className="text-xs text-gray-400">Nilai Kotor</div>
          </div>
          <div className="text-center text-red-500">
            <div className="text-2xl font-bold">-{existing.totalPengurang}</div>
            <div className="text-xs text-gray-400">Pengurang</div>
          </div>
          <div className="text-center text-primary-600">
            <div className="text-2xl font-bold">{existing.nilaiAkhir}</div>
            <div className="text-xs text-gray-400">Nilai Akhir</div>
          </div>
        </div>
      )}

      {/* Pilih Juri */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5">
        <h2 className="font-semibold mb-3">Pilih Juri yang Input Nilai</h2>
        <div className="flex gap-3 flex-wrap">
          {juris.map((j) => (
            <button
              key={j.id}
              type="button"
              onClick={() => {
                setSelectedJuriId(j.id);
                setScores({});
              }}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                selectedJuriId === j.id
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-neutral-200 hover:border-neutral-400"
              }`}
            >
              {j.nama}
            </button>
          ))}
        </div>
        {selectedJuriId && assignedKategoris.length > 0 && (
          <p className="text-xs text-gray-400 mt-2">
            Kategori: {assignedKategoris.join(", ")}
          </p>
        )}
        {selectedJuriId && assignedKategoris.length === 0 && (
          <p className="text-xs text-yellow-600 mt-2">
            Juri ini belum ditugaskan ke kategori manapun.
          </p>
        )}
      </div>

      {/* Form Nilai Diskrit per Kategori */}
      {selectedJuriId && Object.keys(grouped).length > 0 && (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped).map(([kategori, subs]) => {
            const masters = nilaiMasters
              .filter((m) => m.kategori.toLowerCase() === kategori.toLowerCase())
              .sort((a, b) => a.urutan - b.urutan);

            return (
              <div
                key={kategori}
                className="bg-white border border-neutral-200 rounded-xl p-5"
              >
                <h3 className="font-bold text-lg mb-4">
                  [{kategori}] — {kategori}
                </h3>

                {/* Palet Nilai Diskrit */}
                <div className="flex flex-wrap gap-2 mb-5 p-3 bg-neutral-50 rounded-lg">
                  {masters.map((m) => (
                    <div key={m.id} className="flex flex-col gap-1">
                      <span
                        className="text-[10px] px-1 rounded text-white text-center"
                        style={{ backgroundColor: m.warna }}
                      >
                        {m.predikat.replace(/_/g, " ")}
                      </span>
                      <div className="flex gap-1">
                        {(m.nilai as number[]).map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => {
                              // Apply nilai ini ke sub yang sedang di-focus (last clicked)
                            }}
                            className="px-3 py-1.5 rounded-lg border-2 border-neutral-300 text-sm font-bold hover:border-primary-400 transition-colors bg-white"
                            style={{ borderColor: m.warna + "66" }}
                            title={`Nilai: ${n} (${m.predikat})`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tabel Sub-Kategori */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="px-3 py-2 text-left w-16">No</th>
                        <th className="px-3 py-2 text-left">Sub-Kategori</th>
                        <th className="px-3 py-2 text-left w-20">Maks</th>
                        <th className="px-3 py-2 text-left w-44">Pilih Nilai</th>
                        <th className="px-3 py-2 text-left w-24">Predikat</th>
                        <th className="px-3 py-2 text-left">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {subs.map((sub, idx) => {
                        const current = scores[sub.id];
                        const existingScore = existing?.nilaiJuri.find(
                          (nj) => nj.subKategoriId === sub.id
                        );
                        const displayNilai = current?.nilai ?? existingScore?.nilaiDipilih;
                        const displayPredikat = current?.predikat ?? existingScore?.predikat;

                        return (
                          <tr key={sub.id} className="align-top">
                            <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                            <td className="px-3 py-2">
                              <div className="font-medium">{sub.nama}</div>
                              <div className="text-xs text-gray-400 font-mono">{sub.kode}</div>
                            </td>
                            <td className="px-3 py-2 text-gray-500">{sub.maxNilai}</td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {masters.map((m) =>
                                  (m.nilai as number[]).map((n) => (
                                    <button
                                      key={`${sub.id}-${n}`}
                                      type="button"
                                      onClick={() =>
                                        handleNilaiClick(sub.id, n, kategori)
                                      }
                                      className={`px-2 py-1 rounded text-xs font-bold border-2 transition-all ${
                                        displayNilai === n
                                          ? "text-white shadow-md scale-105"
                                          : "bg-white hover:scale-105"
                                      }`}
                                      style={{
                                        borderColor: m.warna,
                                        backgroundColor:
                                          displayNilai === n ? m.warna : undefined,
                                      }}
                                    >
                                      {n}
                                    </button>
                                  ))
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {displayPredikat && (
                                <span
                                  className="px-2 py-0.5 rounded-full text-white text-[10px] font-medium whitespace-nowrap"
                                  style={{
                                    backgroundColor:
                                      PREDIKAT_COLORS[displayPredikat] ?? "#888",
                                  }}
                                >
                                  {displayPredikat.replace(/_/g, " ")}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                placeholder="Catatan..."
                                value={current?.catatan ?? ""}
                                onChange={(e) =>
                                  setScores((prev) => ({
                                    ...prev,
                                    [sub.id]: {
                                      ...prev[sub.id],
                                      catatan: e.target.value,
                                    },
                                  }))
                                }
                                className="border border-neutral-200 rounded px-2 py-1 text-xs w-full"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-neutral-50 font-bold">
                        <td colSpan={3} className="px-3 py-2 text-right">
                          Total sesi ini:
                        </td>
                        <td className="px-3 py-2 text-primary-600 text-lg">
                          {Object.entries(scores)
                            .filter(([id]) =>
                              subs.some((s) => s.id === id)
                            )
                            .reduce((s, [, v]) => s + v.nilai, 0)}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between bg-white border border-neutral-200 rounded-xl p-4">
            <div className="text-sm text-gray-500">
              Total nilai sesi ini:{" "}
              <span className="font-bold text-black text-lg">{totalScore}</span>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="bg-primary-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-60"
            >
              {loading ? "Menyimpan..." : "Simpan Nilai"}
            </button>
          </div>
        </div>
      )}

      {/* Input Pelanggaran */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5">
        <h2 className="font-semibold mb-3">Input Pelanggaran / Pengurangan</h2>
        {pelanggarans.length === 0 ? (
          <p className="text-sm text-gray-400">
            Belum ada master pelanggaran. Tambah di halaman utama penilaian.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-sm">Jenis Pelanggaran</label>
              <select
                value={pelId}
                onChange={(e) => setPelId(e.target.value)}
                className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">-- Pilih --</option>
                {pelanggarans.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.kode}] {p.nama} (-{p.poinPengurangan} poin)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm">Jumlah Kejadian</label>
              <input
                type="number"
                min={1}
                value={kejadian}
                onChange={(e) => setKejadian(parseInt(e.target.value))}
                className="border border-neutral-300 rounded-lg px-3 py-2 text-sm w-24"
              />
            </div>
            <button
              type="button"
              onClick={handleAddPelanggaran}
              className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors"
            >
              Tambah Pelanggaran
            </button>
          </div>
        )}

        {existing && existing.nilaiJuri.length > 0 && (
          <div className="mt-4 text-sm text-gray-500">
            Nilai akhir setelah pengurangan:{" "}
            <span className="font-bold text-black text-base">
              {existing.nilaiAkhir}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
