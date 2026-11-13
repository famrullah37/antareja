"use client";

import { useState } from "react";
import { H2 } from "@/app/components/global/Text";
import SectionWrapper from "@/app/components/global/Wrapper";

type SubKategori = { kode: string; nama: string; kategori: string; maxNilai: number };
type NilaiJuriItem = {
  nilaiDipilih: number;
  predikat: string;
  catatan: string | null;
  juri: { id?: string; nama: string };
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
  masukanSuara?: { id: string; durasiDetik: number; updatedAt: Date | string; juri: { nama: string } }[];
} | null;

function formatDurasi(detik: number) {
  return `${Math.floor(detik / 60)}:${String(detik % 60).padStart(2, "0")}`;
}

// Tampil sebelum maupun sesudah nilai dipublish — rekaman tidak memuat angka nilai.
function MasukanSuaraJuri({ rekaman }: { rekaman: NonNullable<NonNullable<PenilaianBaruData>["masukanSuara"]> }) {
  if (rekaman.length === 0) return null;
  return (
    <div className="mb-4 bg-white rounded-xl border border-neutral-200 p-4">
      <p className="text-sm font-semibold mb-3">Masukan Suara Juri</p>
      <div className="flex flex-col gap-4">
        {rekaman.map((ms) => (
          <div key={ms.id} className="flex flex-col gap-1.5">
            <p className="text-sm text-neutral-600">
              {ms.juri.nama} <span className="text-xs text-gray-400">· {formatDurasi(ms.durasiDetik)}</span>
            </p>
            <audio
              controls
              preload="none"
              src={`/api/masukan-suara/${ms.id}?v=${new Date(ms.updatedAt).getTime()}`}
              className="w-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const PREDIKAT_COLOR: Record<string, { bg: string; text: string }> = {
  SANGAT_BAGUS:  { bg: "bg-green-100",  text: "text-green-700"  },
  BAGUS:         { bg: "bg-lime-100",   text: "text-lime-700"   },
  CUKUP_BAGUS:   { bg: "bg-yellow-100", text: "text-yellow-700" },
  CUKUP:         { bg: "bg-orange-100", text: "text-orange-700" },
  KURANG:        { bg: "bg-red-100",    text: "text-red-600"    },
  SANGAT_KURANG: { bg: "bg-red-200",    text: "text-red-800"    },
};

// Satu kategori = matriks: baris sub-kategori, kolom tiap juri yang menilai
// kategori ini, lalu jumlah. Subtotal per juri di baris bawah. Sel kosong = juri
// itu tidak memberi nilai di sub-kategori tersebut.
function KategoriCard({ kategori, items }: { kategori: string; items: NilaiJuriItem[] }) {
  const [open, setOpen] = useState(true);
  const kunciJuri = (n: NilaiJuriItem) => n.juri.id ?? n.juri.nama;

  const juris = Array.from(new Map(items.map((n) => [kunciJuri(n), n.juri.nama])).entries()).map(([id, nama]) => ({
    id,
    nama,
  }));
  const subs = Array.from(new Map(items.map((n) => [n.subKategori.kode, n.subKategori])).values());
  const sel = new Map(items.map((n) => [`${n.subKategori.kode}|${kunciJuri(n)}`, n]));

  const total = items.reduce((s, n) => s + n.nilaiDipilih, 0);
  // Maks = maks sub-kategori × jumlah juri yang menilai kategori ini.
  const maxTotal = subs.reduce((s, x) => s + x.maxNilai, 0) * juris.length;
  const persen = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
  const subtotalJuri = (id: string) =>
    items.filter((n) => kunciJuri(n) === id).reduce((s, n) => s + n.nilaiDipilih, 0);

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      {/* Header kategori — klik untuk buka/tutup */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-neutral-50 border-b border-neutral-100 hover:bg-neutral-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-sm transition-transform duration-200 ${open ? "rotate-90" : ""}`}>▶</span>
          <div className="min-w-0">
            <div className="font-semibold text-sm">{kategori}</div>
            <div className="text-xs text-gray-400">
              {subs.length} sub-kategori · {juris.length} juri
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {maxTotal > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-24 h-1.5 bg-neutral-200 rounded-full">
                <div className="h-1.5 rounded-full bg-primary-500 transition-all" style={{ width: `${persen}%` }} />
              </div>
              <span className="text-xs text-gray-400">{persen}%</span>
            </div>
          )}
          <span className="font-bold text-base tabular-nums whitespace-nowrap">
            {total}
            {maxTotal > 0 && <span className="text-xs text-gray-400 font-normal"> / {maxTotal}</span>}
          </span>
        </div>
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-neutral-100 bg-white">
                <th className="sticky left-0 z-10 bg-white px-4 sm:px-5 py-2 text-left font-medium min-w-[120px] sm:min-w-[180px]">
                  Sub-Kategori
                </th>
                {juris.map((j) => (
                  <th key={j.id} className="px-2 sm:px-3 py-2 text-center font-medium min-w-[96px]">
                    {j.nama}
                  </th>
                ))}
                {juris.length > 1 && <th className="px-3 py-2 text-center font-medium">Jumlah</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {subs.map((sk) => {
                const jumlah = juris.reduce((s, j) => s + (sel.get(`${sk.kode}|${j.id}`)?.nilaiDipilih ?? 0), 0);
                return (
                  <tr key={sk.kode} className="align-top">
                    <td className="sticky left-0 z-10 bg-white px-4 sm:px-5 py-3">
                      <div className="font-medium text-neutral-800">{sk.nama}</div>
                      <div className="text-xs text-gray-400 font-mono">
                        {sk.kode} · maks {sk.maxNilai}
                      </div>
                    </td>
                    {juris.map((j) => {
                      const nj = sel.get(`${sk.kode}|${j.id}`);
                      if (!nj)
                        return (
                          <td key={j.id} className="px-3 py-3 text-center text-gray-300">
                            —
                          </td>
                        );
                      const clr = PREDIKAT_COLOR[nj.predikat] ?? { bg: "bg-neutral-100", text: "text-neutral-600" };
                      return (
                        <td key={j.id} className="px-2 sm:px-3 py-3 text-center">
                          <div className="font-bold text-base tabular-nums">{nj.nilaiDipilih}</div>
                          <span
                            className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${clr.bg} ${clr.text}`}
                          >
                            {nj.predikat.replace(/_/g, " ")}
                          </span>
                          {nj.catatan && (
                            <div className="mt-1 text-[11px] leading-snug text-gray-500 text-left italic">
                              “{nj.catatan}”
                            </div>
                          )}
                        </td>
                      );
                    })}
                    {juris.length > 1 && (
                      <td className="px-3 py-3 text-center font-bold tabular-nums text-neutral-700">{jumlah}</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-neutral-200 bg-neutral-50 font-semibold">
                <td className="sticky left-0 z-10 bg-neutral-50 px-4 sm:px-5 py-2 text-xs text-gray-600">
                  Subtotal juri
                </td>
                {juris.map((j) => (
                  <td key={j.id} className="px-3 py-2 text-center tabular-nums">
                    {subtotalJuri(j.id)}
                  </td>
                ))}
                {juris.length > 1 && (
                  <td className="px-3 py-2 text-center tabular-nums text-primary-600">{total}</td>
                )}
              </tr>
            </tfoot>
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
        <MasukanSuaraJuri rekaman={penilaianBaru.masukanSuara ?? []} />
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-10 text-center">
          <div className="text-4xl mb-3">⏳</div>
          <p className="font-semibold text-blue-700">Penilaian sedang diproses</p>
          <p className="text-blue-500 text-sm mt-1">
            Nilai akan ditampilkan setelah pengumuman resmi dari panitia.
          </p>
        </div>
      </SectionWrapper>
    );
  }

  // Dikelompokkan tanpa membedakan huruf besar/kecil ("PBB" = "pbb"); urutan
  // mengikuti urutan sub-kategori di master (data sudah diurutkan di server).
  const namaKategori = new Map<string, string>();
  const byKategori = penilaianBaru.nilaiJuri.reduce<Record<string, NilaiJuriItem[]>>((acc, nj) => {
    const kunci = nj.subKategori.kategori.trim().toUpperCase();
    if (!namaKategori.has(kunci)) namaKategori.set(kunci, nj.subKategori.kategori);
    (acc[namaKategori.get(kunci)!] ??= []).push(nj);
    return acc;
  }, {});

  const hasDetail = Object.keys(byKategori).length > 0;

  return (
    <SectionWrapper id="nilai-akhir">
      <H2 className="mb-5">Hasil Penilaian</H2>

      {/* Ringkasan skor */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
        <div className="bg-white rounded-xl border border-neutral-200 p-3 sm:p-4 text-center">
          <div className="text-lg sm:text-2xl font-bold text-neutral-800">{penilaianBaru.nilaiKotor}</div>
          <div className="text-xs text-gray-400 mt-1">Nilai Kotor</div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-3 sm:p-4 text-center">
          <div className="text-lg sm:text-2xl font-bold text-red-500">-{penilaianBaru.totalPengurang}</div>
          <div className="text-xs text-gray-400 mt-1">Pengurangan</div>
        </div>
        <div className="bg-primary-50 rounded-xl border border-primary-200 p-3 sm:p-4 text-center">
          <div className="text-lg sm:text-2xl font-bold text-primary-600">{penilaianBaru.nilaiAkhir}</div>
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

      {/* Masukan suara juri */}
      <MasukanSuaraJuri rekaman={penilaianBaru.masukanSuara ?? []} />

      {/* Detail per kategori */}
      {hasDetail ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-500 font-medium">
            Detail per Kategori — nilai tiap sub-kategori dari masing-masing juri
          </p>
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
