"use client";

import { hapusSaran, tandaiSaranDibaca, tanggapiSaran } from "@/actions/Saran";
import { KATEGORI_SARAN, labelKategoriSaran } from "@/lib/saranTim";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Saran = {
  id: string;
  namaTim: string;
  asalSekolah: string;
  jenjang: string;
  pengirim: string;
  kategori: string;
  isi: string;
  rating: number | null;
  dibaca: boolean;
  tanggapan: string | null;
  createdAt: string;
};

function Bintang({ n }: { n: number | null }) {
  if (!n) return <span className="text-gray-300 text-xs">tanpa bintang</span>;
  return (
    <span className="text-amber-400" aria-label={`${n} dari 5 bintang`}>
      {"★".repeat(n)}
      <span className="text-gray-300">{"★".repeat(5 - n)}</span>
    </span>
  );
}

function KartuSaran({ s, bolehHapus }: { s: Saran; bolehHapus: boolean }) {
  const [tanggapan, setTanggapan] = useState(s.tanggapan ?? "");
  const [buka, setBuka] = useState(false);
  const [loading, setLoading] = useState(false);

  async function jalankan(fn: () => Promise<{ success: boolean; message?: string }>, sukses: string) {
    setLoading(true);
    try {
      const r = await fn();
      if (r.success) toast.success(sukses);
      else toast.error(r.message ?? "Gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`bg-white border rounded-xl p-4 text-sm ${s.dibaca ? "border-gray-200" : "border-primary-300 ring-2 ring-primary-50"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-semibold">
            {s.namaTim} <span className="font-normal text-gray-500">— {s.asalSekolah} ({s.jenjang})</span>
          </div>
          <div className="text-xs text-gray-400">
            {s.pengirim} ·{" "}
            {new Date(s.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!s.dibaca && <span className="text-[11px] font-bold bg-primary-500 text-white rounded-full px-2 py-0.5">BARU</span>}
          <span className="bg-neutral-100 rounded-full px-2.5 py-0.5 text-xs font-semibold text-gray-700">
            {labelKategoriSaran(s.kategori)}
          </span>
          <Bintang n={s.rating} />
        </div>
      </div>
      <p className="whitespace-pre-line text-gray-800">{s.isi}</p>

      {s.tanggapan && !buka && (
        <div className="mt-3 bg-primary-50 border-l-4 border-primary-400 rounded-r-lg px-3 py-2">
          <div className="text-xs font-semibold text-primary-600 mb-0.5">Tanggapan panitia (terlihat oleh tim)</div>
          <p className="whitespace-pre-line text-gray-700">{s.tanggapan}</p>
        </div>
      )}

      {buka && (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={tanggapan}
            onChange={(e) => setTanggapan(e.target.value)}
            rows={3}
            placeholder="Tanggapan ini akan tampil di dashboard tim pengirim. Kosongkan untuk menghapus tanggapan."
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => jalankan(() => tanggapiSaran(s.id, tanggapan), "Tanggapan disimpan").then(() => setBuka(false))}
              className="bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white text-xs font-semibold rounded-lg px-4 py-2"
            >
              Simpan Tanggapan
            </button>
            <button type="button" onClick={() => setBuka(false)} className="text-xs text-gray-500 px-3">
              Batal
            </button>
          </div>
        </div>
      )}

      {!buka && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => setBuka(true)}
            className="border border-primary-300 text-primary-600 hover:bg-primary-50 rounded-lg px-3 py-1.5 font-semibold"
          >
            {s.tanggapan ? "Ubah Tanggapan" : "Tanggapi"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => jalankan(() => tandaiSaranDibaca([s.id], !s.dibaca), s.dibaca ? "Ditandai belum dibaca" : "Ditandai sudah dibaca")}
            className="border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg px-3 py-1.5"
          >
            {s.dibaca ? "Tandai belum dibaca" : "Tandai sudah dibaca"}
          </button>
          {bolehHapus && (
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (confirm(`Hapus saran dari ${s.namaTim}?`)) jalankan(() => hapusSaran(s.id), "Saran dihapus");
              }}
              className="text-red-500 hover:bg-red-50 rounded-lg px-3 py-1.5"
            >
              Hapus
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function SaranClient({ saran, bolehHapus }: { saran: Saran[]; bolehHapus: boolean }) {
  const [kategori, setKategori] = useState("");
  const [jenjang, setJenjang] = useState("");
  const [status, setStatus] = useState<"" | "baru" | "dibaca">("");
  const [cari, setCari] = useState("");

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return saran.filter(
      (s) =>
        (!kategori || s.kategori === kategori) &&
        (!jenjang || s.jenjang === jenjang) &&
        (!status || (status === "baru" ? !s.dibaca : s.dibaca)) &&
        (!q || `${s.namaTim} ${s.asalSekolah} ${s.isi}`.toLowerCase().includes(q))
    );
  }, [saran, kategori, jenjang, status, cari]);

  const jumlahBaru = saran.filter((s) => !s.dibaca).length;
  const berRating = saran.filter((s) => s.rating);
  const rataRating = berRating.length ? berRating.reduce((a, s) => a + (s.rating ?? 0), 0) / berRating.length : null;
  const baruTampil = tampil.filter((s) => !s.dibaca).map((s) => s.id);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500">Total masukan</div>
          <div className="text-2xl font-bold">{saran.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500">Belum dibaca</div>
          <div className="text-2xl font-bold text-primary-600">{jumlahBaru}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 col-span-2 sm:col-span-1">
          <div className="text-xs text-gray-500">Rata-rata bintang</div>
          <div className="text-2xl font-bold">
            {rataRating ? rataRating.toFixed(1) : "–"}
            <span className="text-sm font-normal text-gray-400"> / 5 ({berRating.length} penilai)</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari tim, sekolah, atau isi..."
          className="border border-gray-300 rounded-lg text-sm px-3 py-2 bg-white flex-1 min-w-[180px]"
        />
        <select value={kategori} onChange={(e) => setKategori(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2 bg-white">
          <option value="">Semua kategori</option>
          {KATEGORI_SARAN.map((k) => (
            <option key={k.key} value={k.key}>
              {k.label}
            </option>
          ))}
        </select>
        <select value={jenjang} onChange={(e) => setJenjang(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2 bg-white">
          <option value="">Semua jenjang</option>
          {["SD", "SMP", "SMA", "PURNA"].map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="border border-gray-300 rounded-lg text-sm px-3 py-2 bg-white">
          <option value="">Semua status</option>
          <option value="baru">Belum dibaca</option>
          <option value="dibaca">Sudah dibaca</option>
        </select>
        {baruTampil.length > 0 && (
          <button
            type="button"
            onClick={async () => {
              const r = await tandaiSaranDibaca(baruTampil, true);
              if (r.success) toast.success(`${baruTampil.length} masukan ditandai sudah dibaca`);
              else toast.error(r.message ?? "Gagal");
            }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white hover:bg-gray-50"
          >
            Tandai semua dibaca ({baruTampil.length})
          </button>
        )}
      </div>

      {tampil.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white border border-gray-200 rounded-xl p-6 text-center">
          {saran.length === 0 ? "Belum ada saran atau masukan dari tim." : "Tidak ada masukan yang cocok dengan filter."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {tampil.map((s) => (
            <KartuSaran key={s.id} s={s} bolehHapus={bolehHapus} />
          ))}
        </div>
      )}
    </div>
  );
}
