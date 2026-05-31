"use client";

import { useState } from "react";
import { H2 } from "@/app/components/global/Text";
import SectionWrapper from "@/app/components/global/Wrapper";

type SubKategori = { kode: string; nama: string; kategori: string; maxNilai: number };
type NilaiJuriItem = {
  nilaiDipilih: number;
  predikat: string;
  catatan: string | null;
  juri: { nama: string };
  subKategori: SubKategori;
};
type PelanggaranItem = {
  jumlahKejadian: number;
  totalPengurang: number;
  pelanggaran: { kode: string; nama: string };
};
type PenilaianBaruData = {
  nilaiKotor: number;
  totalPengurang: number;
  nilaiAkhir: number;
  published: boolean;
  nilaiJuri: NilaiJuriItem[];
  pelanggaranTim: PelanggaranItem[];
} | null;

const PREDIKAT_COLOR: Record<string, { bg: string; text: string }> = {
  SANGAT_BAGUS:  { bg: "bg-green-100",  text: "text-green-700"  },
  BAGUS:         { bg: "bg-lime-100",   text: "text-lime-700"   },
  CUKUP_BAGUS:   { bg: "bg-yellow-100", text: "text-yellow-700" },
  CUKUP:         { bg: "bg-orange-100", text: "text-orange-700" },
  KURANG:        { bg: "bg-red-100",    text: "text-red-600"    },
  SANGAT_KURANG: { bg: "bg-red-200",    text: "text-red-800"    },
};

function KategoriCard({ kategori, items }: { kategori: string; items: NilaiJuriItem[] }) {
  const [open, setOpen] = useState(true);
  const total = items.reduce((s, n) => s + n.nilaiDipilih, 0);
  const maxTotal = items.reduce((s, n) => s + n.subKategori.maxNilai, 0);
  const persen = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      {/* Header kategori — klik untuk buka/tutup */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3 bg-neutral-50 border-b border-neutral-100 hover:bg-neutral-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className={`text-sm transition-transform duration-200 ${open ? "rotate-90" : ""}`}>▶</span>
          <span className="font-semibold text-sm">{kategori}</span>
        </div>
        <div className="flex items-center gap-3">
          {maxTotal > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-24 h-1.5 bg-neutral-200 rounded-full">
                <div
                  className="h-1.5 rounded-full bg-primary-500 transition-all"
                  style={{ width: `${persen}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">{persen}%</span>
            </div>
          )}
          <span className="font-bold text-base tabular-nums">
            {total}
            {maxTotal > 0 && <span className="text-xs text-gray-400 font-normal"> / {maxTotal}</span>}
          </span>
        </div>
      </button>

      {/* Detail tabel */}
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-neutral-100">
                <th className="px-5 py-2 text-left">Sub-Kategori</th>
                <th className="px-5 py-2 text-left">Juri</th>
                <th className="px-5 py-2 text-center">Nilai</th>
                <th className="px-5 py-2 text-left">Predikat</th>
                <th className="px-5 py-2 text-left">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {items.map((nj, i) => {
                const clr = PREDIKAT_COLOR[nj.predikat] ?? { bg: "bg-neutral-100", text: "text-neutral-600" };
                return (
                  <tr key={i} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-neutral-800">{nj.subKategori.nama}</div>
                      <div className="text-xs text-gray-400 font-mono">{nj.subKategori.kode}</div>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{nj.juri.nama}</td>
                    <td className="px-5 py-3 text-center">
                      <span className="font-bold text-base">{nj.nilaiDipilih}</span>
                      {nj.subKategori.maxNilai > 0 && (
                        <span className="text-xs text-gray-400"> /{nj.subKategori.maxNilai}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${clr.bg} ${clr.text}`}>
                        {nj.predikat.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400 max-w-[180px]">
                      {nj.catatan ?? <span className="italic">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function NilaiAkhirSection({ penilaianBaru }: { penilaianBaru: PenilaianBaruData }) {
  if (!penilaianBaru) {
    return (
      <SectionWrapper id="nilai-akhir">
        <H2 className="mb-4">Hasil Penilaian</H2>
        <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-10 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500 font-medium">Penilaian tim Anda belum dimulai.</p>
        </div>
      </SectionWrapper>
    );
  }

  if (!penilaianBaru.published) {
    return (
      <SectionWrapper id="nilai-akhir">
        <H2 className="mb-4">Hasil Penilaian</H2>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-10 text-center">
          <div className="text-4xl mb-3">⏳</div>
          <p className="font-semibold text-blue-700">Penilaian sedang diproses</p>
          <p className="text-blue-500 text-sm mt-1">
            Hasil akan ditampilkan setelah pengumuman resmi dari panitia.
          </p>
        </div>
      </SectionWrapper>
    );
  }

  const byKategori = penilaianBaru.nilaiJuri.reduce<Record<string, NilaiJuriItem[]>>((acc, nj) => {
    const kat = nj.subKategori.kategori;
    if (!acc[kat]) acc[kat] = [];
    acc[kat].push(nj);
    return acc;
  }, {});

  const hasDetail = Object.keys(byKategori).length > 0;

  return (
    <SectionWrapper id="nilai-akhir">
      <H2 className="mb-5">Hasil Penilaian</H2>

      {/* Ringkasan skor */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-neutral-200 p-4 text-center">
          <div className="text-2xl font-bold text-neutral-800">{penilaianBaru.nilaiKotor}</div>
          <div className="text-xs text-gray-400 mt-1">Nilai Kotor</div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-4 text-center">
          <div className="text-2xl font-bold text-red-500">-{penilaianBaru.totalPengurang}</div>
          <div className="text-xs text-gray-400 mt-1">Pengurangan</div>
        </div>
        <div className="bg-primary-50 rounded-xl border border-primary-200 p-4 text-center">
          <div className="text-2xl font-bold text-primary-600">{penilaianBaru.nilaiAkhir}</div>
          <div className="text-xs text-primary-500 mt-1 font-medium">Nilai Akhir</div>
        </div>
      </div>

      {/* Pengurangan poin */}
      {penilaianBaru.pelanggaranTim.length > 0 && (
        <div className="mb-4 bg-red-50 rounded-xl border border-red-100 p-4">
          <p className="text-sm font-semibold text-red-700 mb-2">Pengurangan Poin</p>
          <div className="flex flex-col gap-1.5">
            {penilaianBaru.pelanggaranTim.map((pt, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-neutral-600">
                  <span className="font-mono text-xs bg-red-100 px-1.5 py-0.5 rounded mr-2">{pt.pelanggaran.kode}</span>
                  {pt.pelanggaran.nama} × {pt.jumlahKejadian}
                </span>
                <span className="text-red-600 font-semibold">-{pt.totalPengurang}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail per kategori */}
      {hasDetail ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-500 font-medium">Detail per Kategori</p>
          {Object.entries(byKategori).map(([kat, items]) => (
            <KategoriCard key={kat} kategori={kat} items={items} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center">
          <p className="text-gray-400 text-sm">Detail penilaian per kategori belum tersedia.</p>
        </div>
      )}
    </SectionWrapper>
  );
}
