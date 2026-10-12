"use client";

import { hapusPelanggaranTim, inputNilaiJuri, inputPelanggaranTim } from "@/actions/PenilaianBaru";
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
type JuriKat = { id: string; juriId: string; kategori: string };
type Pelanggaran = { id: string; kode: string; nama: string; poinPengurangan: number };
type Tim = { id: string };
type Existing = {
  id: string;
  nilaiKotor: number;
  totalPengurang: number;
  nilaiAkhir: number;
  published: boolean;
  nilaiJuri: {
    subKategoriId: string;
    juriId: string;
    nilaiDipilih: number;
    predikat: string;
    catatan: string | null;
  }[];
  pelanggaranTim: {
    id: string;
    jumlahKejadian: number;
    totalPengurang: number;
    pelanggaran: { kode: string; nama: string };
  }[];
} | null;

type Skor = { nilai: number; catatan: string };

function predikatDari(nilai: number, masters: NilaiDiskrit[], kategori: string) {
  return masters.find(
    (m) => m.kategori.toLowerCase() === kategori.toLowerCase() && (m.nilai as number[]).includes(nilai)
  );
}

export default function InputNilaiForm({
  tim,
  juriAktif,
  subKategoris,
  nilaiMasters,
  pelanggarans,
  juriKategoris,
  existing,
}: {
  tim: Tim;
  juriAktif: Juri | null;
  subKategoris: SubKategori[];
  nilaiMasters: NilaiDiskrit[];
  pelanggarans: Pelanggaran[];
  juriKategoris: JuriKat[];
  existing: Existing;
}) {
  // Nilai lama milik juri INI saja — dulu dicari per sub-kategori tanpa juriId,
  // sehingga juri B bisa melihat (dan mengira) nilai juri A sebagai nilainya.
  const nilaiLama = (existing?.nilaiJuri ?? []).filter((nj) => nj.juriId === juriAktif?.id);
  const [scores, setScores] = useState<Record<string, Skor>>({});
  const [catatanTerbuka, setCatatanTerbuka] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const terkunci = !!existing?.published;

  const kategoriJuri = juriKategoris
    .filter((jk) => jk.juriId === juriAktif?.id)
    .map((jk) => jk.kategori);
  const kategoriKecil = kategoriJuri.map((k) => k.toLowerCase());
  const subSaya = subKategoris.filter((s) => kategoriKecil.includes(s.kategori.toLowerCase()));

  const grouped = subSaya.reduce<Record<string, SubKategori[]>>((acc, sub) => {
    const key = kategoriJuri.find((k) => k.toLowerCase() === sub.kategori.toLowerCase()) ?? sub.kategori;
    (acc[key] ??= []).push(sub);
    return acc;
  }, {});

  function nilaiTampil(subId: string) {
    return scores[subId]?.nilai ?? nilaiLama.find((n) => n.subKategoriId === subId)?.nilaiDipilih;
  }
  function catatanTampil(subId: string) {
    return scores[subId]?.catatan ?? nilaiLama.find((n) => n.subKategoriId === subId)?.catatan ?? "";
  }

  const terisi = subSaya.filter((s) => nilaiTampil(s.id) !== undefined).length;
  const total = subSaya.reduce((sum, s) => sum + (nilaiTampil(s.id) ?? 0), 0);
  const adaPerubahan = Object.keys(scores).length > 0;

  async function handleSubmit() {
    const entries = Object.entries(scores).map(([subKategoriId, v]) => ({
      subKategoriId,
      nilai: v.nilai,
      catatan: v.catatan || undefined,
    }));
    if (entries.length === 0) {
      toast.error("Belum ada nilai yang diubah");
      return;
    }
    setLoading(true);
    const toastId = toast.loading("Menyimpan nilai...");
    const result = await inputNilaiJuri(tim.id, entries);
    setLoading(false);
    if (result.success) {
      toast.success("Nilai berhasil disimpan!", { id: toastId });
      setScores({});
    } else {
      toast.error(result.message ?? "Gagal menyimpan nilai", { id: toastId });
    }
  }

  const [pelId, setPelId] = useState("");
  const [kejadian, setKejadian] = useState(1);

  async function handleAddPelanggaran() {
    const pel = pelanggarans.find((p) => p.id === pelId);
    if (!pel) {
      toast.error("Pilih jenis pelanggaran");
      return;
    }
    if (!confirm(`Tambah pelanggaran [${pel.kode}] ${pel.nama} × ${kejadian} (−${pel.poinPengurangan * kejadian} poin)?`))
      return;
    const toastId = toast.loading("Menambah pelanggaran...");
    const result = await inputPelanggaranTim(tim.id, pel.id, kejadian);
    if (result.success) {
      toast.success("Pelanggaran ditambahkan", { id: toastId });
      setPelId("");
      setKejadian(1);
    } else toast.error(result.message ?? "Gagal", { id: toastId });
  }

  async function handleHapusPelanggaran(id: string, label: string) {
    if (!confirm(`Hapus pelanggaran ${label}?`)) return;
    const toastId = toast.loading("Menghapus...");
    const result = await hapusPelanggaranTim(id);
    if (result.success) toast.success("Pelanggaran dihapus", { id: toastId });
    else toast.error(result.message ?? "Gagal menghapus", { id: toastId });
  }

  if (!juriAktif) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-5 text-sm">
        Akun ini belum terhubung ke data Juri, jadi tidak bisa memberi nilai. Hubungkan akun di menu Juri
        (admin), lalu login sebagai juri tersebut.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-28">
      {/* Identitas juri + ringkasan */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div>
          <div className="text-xs text-gray-400">Juri</div>
          <div className="font-bold text-lg">{juriAktif.nama}</div>
          <div className="text-xs text-gray-500">
            {kategoriJuri.length ? `Kategori: ${kategoriJuri.join(", ")}` : "Belum ditugaskan ke kategori"}
          </div>
        </div>
        {existing && (
          <div className="flex gap-6 ml-auto">
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
      </div>

      {terkunci && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 text-sm">
          Nilai tim ini sudah dipublish — tidak bisa diubah. Hubungi admin bila perlu koreksi.
        </div>
      )}

      {/* Kartu per sub-kategori — tombol besar untuk layar sentuh */}
      {Object.entries(grouped).map(([kategori, subs]) => {
        const masters = nilaiMasters
          .filter((m) => m.kategori.toLowerCase() === kategori.toLowerCase())
          .sort((a, b) => a.urutan - b.urutan);
        return (
          <section key={kategori} className="flex flex-col gap-3">
            <h2 className="font-bold text-lg">Kategori {kategori}</h2>
            <div className="grid xl:grid-cols-2 gap-3">
              {subs.map((sub, idx) => {
                const dipilih = nilaiTampil(sub.id);
                const pred = dipilih !== undefined ? predikatDari(dipilih, nilaiMasters, kategori) : undefined;
                const berubah = scores[sub.id] !== undefined;
                return (
                  <div
                    key={sub.id}
                    className={`bg-white rounded-xl border-2 p-4 flex flex-col gap-3 ${
                      berubah ? "border-primary-300" : "border-neutral-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">
                          {idx + 1}. {sub.nama}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">
                          {sub.kode} · maks {sub.maxNilai}
                        </div>
                      </div>
                      {dipilih !== undefined && (
                        <span
                          className="px-3 py-1 rounded-full text-white text-sm font-bold whitespace-nowrap"
                          style={{ backgroundColor: pred?.warna ?? "#888" }}
                        >
                          {dipilih} · {(pred?.predikat ?? "").replace(/_/g, " ")}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {masters.map((m) => (
                        <div key={m.id} className="flex flex-wrap items-center gap-2">
                          <span className="w-28 shrink-0 text-xs font-semibold" style={{ color: m.warna }}>
                            {m.predikat.replace(/_/g, " ")}
                          </span>
                          {(m.nilai as number[]).map((n) => {
                            const aktif = dipilih === n;
                            return (
                              <button
                                key={n}
                                type="button"
                                disabled={terkunci}
                                onClick={() =>
                                  setScores((prev) => ({
                                    ...prev,
                                    [sub.id]: { nilai: n, catatan: prev[sub.id]?.catatan ?? catatanTampil(sub.id) },
                                  }))
                                }
                                className="min-w-[3rem] h-12 px-3 rounded-lg border-2 text-base font-bold transition-colors disabled:opacity-50"
                                style={{
                                  borderColor: m.warna,
                                  backgroundColor: aktif ? m.warna : "white",
                                  color: aktif ? "white" : undefined,
                                }}
                              >
                                {n}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>

                    {catatanTerbuka[sub.id] || catatanTampil(sub.id) ? (
                      <input
                        type="text"
                        maxLength={500}
                        disabled={terkunci}
                        placeholder="Catatan untuk sub-kategori ini..."
                        value={catatanTampil(sub.id)}
                        onChange={(e) => {
                          const n = nilaiTampil(sub.id);
                          if (n === undefined) {
                            toast.error("Pilih nilai dulu sebelum menulis catatan");
                            return;
                          }
                          const catatan = e.target.value;
                          setScores((prev) => ({ ...prev, [sub.id]: { nilai: n, catatan } }));
                        }}
                        className="border border-neutral-300 rounded-lg px-3 py-2.5 text-sm w-full"
                      />
                    ) : (
                      !terkunci && (
                        <button
                          type="button"
                          onClick={() => setCatatanTerbuka((p) => ({ ...p, [sub.id]: true }))}
                          className="self-start text-sm text-primary-500 font-medium py-1"
                        >
                          + Catatan
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {Object.keys(grouped).length === 0 && kategoriJuri.length > 0 && (
        <p className="text-sm text-gray-400">Belum ada sub-kategori aktif untuk kategori Anda.</p>
      )}

      {/* Pelanggaran */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5">
        <h2 className="font-semibold mb-3">Pelanggaran / Pengurangan</h2>
        {existing && existing.pelanggaranTim.length > 0 && (
          <ul className="mb-4 text-sm divide-y divide-neutral-100">
            {existing.pelanggaranTim.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <span className="flex-1">
                  [{p.pelanggaran.kode}] {p.pelanggaran.nama} × {p.jumlahKejadian}
                </span>
                <span className="text-red-500 font-semibold">-{p.totalPengurang}</span>
                {!terkunci && (
                  <button
                    type="button"
                    onClick={() =>
                      handleHapusPelanggaran(p.id, `[${p.pelanggaran.kode}] × ${p.jumlahKejadian}`)
                    }
                    className="text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-lg px-3 py-2"
                  >
                    Hapus
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {pelanggarans.length === 0 ? (
          <p className="text-sm text-gray-400">Belum ada master pelanggaran.</p>
        ) : (
          !terkunci && (
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1 flex-1 min-w-[14rem]">
                <label className="text-sm">Jenis Pelanggaran</label>
                <select
                  value={pelId}
                  onChange={(e) => setPelId(e.target.value)}
                  className="border border-neutral-300 rounded-lg px-3 py-3 text-sm"
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
                  max={50}
                  value={kejadian}
                  onChange={(e) => setKejadian(Math.max(1, parseInt(e.target.value) || 1))}
                  className="border border-neutral-300 rounded-lg px-3 py-3 text-sm w-24"
                />
              </div>
              <button
                type="button"
                onClick={handleAddPelanggaran}
                className="bg-red-500 text-white px-5 py-3 rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                Tambah Pelanggaran
              </button>
            </div>
          )
        )}
      </div>

      {/* Bar simpan — selalu terlihat saat menggulir di tablet */}
      {!terkunci && subSaya.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-80 z-30 bg-white/95 backdrop-blur border-t border-neutral-200 px-4 sm:px-8 py-3 flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Terisi{" "}
            <b className={terisi === subSaya.length ? "text-green-600" : "text-black"}>
              {terisi}/{subSaya.length}
            </b>{" "}
            · Total <b className="text-black text-lg">{total}</b>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !adaPerubahan}
            className="ml-auto bg-primary-500 text-white px-8 h-12 rounded-xl font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : adaPerubahan ? "Simpan Nilai" : "Tersimpan"}
          </button>
        </div>
      )}
    </div>
  );
}
