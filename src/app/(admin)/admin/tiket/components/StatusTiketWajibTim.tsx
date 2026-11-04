"use client";

import { useMemo, useState } from "react";

export type BarisStatusTiketTim = {
  timId: string;
  namaTim: string;
  asalSekolah: string;
  jenjang: string;
  confirmed: boolean;
  lunas: number; // jumlah tiket wajib VERIFIED
  menunggu: number; // jumlah tiket wajib PENDING
};

type Filter = "SEMUA" | "SUDAH" | "MENUNGGU" | "BELUM";

function statusBaris(b: BarisStatusTiketTim): Exclude<Filter, "SEMUA"> {
  if (b.lunas > 0) return "SUDAH";
  if (b.menunggu > 0) return "MENUNGGU";
  return "BELUM";
}

const LABEL: Record<Exclude<Filter, "SEMUA">, { teks: string; kelas: string }> = {
  SUDAH: { teks: "Sudah beli", kelas: "bg-green-50 text-green-700" },
  MENUNGGU: { teks: "Menunggu verifikasi", kelas: "bg-yellow-50 text-yellow-700" },
  BELUM: { teks: "Belum beli", kelas: "bg-red-50 text-red-700" },
};

// Rekap pembelian tiket wajib per tim (tiket dengan khususTim = true).
// Transaksi dihubungkan lewat akun: TransaksiTiket.userId = Tim.userId.
export default function StatusTiketWajibTim({ baris }: { baris: BarisStatusTiketTim[] }) {
  const [filter, setFilter] = useState<Filter>("SEMUA");
  const [cari, setCari] = useState("");

  const jumlah = useMemo(() => {
    const j = { SUDAH: 0, MENUNGGU: 0, BELUM: 0 };
    baris.forEach((b) => j[statusBaris(b)]++);
    return j;
  }, [baris]);

  const tampil = baris.filter((b) => {
    if (filter !== "SEMUA" && statusBaris(b) !== filter) return false;
    const q = cari.trim().toLowerCase();
    return !q || b.namaTim.toLowerCase().includes(q) || b.asalSekolah.toLowerCase().includes(q);
  });

  const tombol: { key: Filter; label: string }[] = [
    { key: "SEMUA", label: `Semua (${baris.length})` },
    { key: "SUDAH", label: `Sudah beli (${jumlah.SUDAH})` },
    { key: "MENUNGGU", label: `Menunggu verifikasi (${jumlah.MENUNGGU})` },
    { key: "BELUM", label: `Belum beli (${jumlah.BELUM})` },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-2">
          {tombol.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
                filter === t.key
                  ? "bg-primary-500 border-primary-500 text-white"
                  : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari tim / sekolah"
          className="border border-neutral-200 rounded-lg px-3 py-1.5 text-sm w-full sm:w-56"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3 text-left">Tim</th>
              <th className="px-4 py-3 text-left">Jenjang</th>
              <th className="px-4 py-3 text-left">Pendaftaran</th>
              <th className="px-4 py-3 text-left">Tiket Wajib</th>
              <th className="px-4 py-3 text-left">Jumlah</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {tampil.length === 0 ? (
              <tr className="bg-white">
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-400">
                  Tidak ada tim.
                </td>
              </tr>
            ) : (
              tampil.map((b) => {
                const s = LABEL[statusBaris(b)];
                return (
                  <tr key={b.timId} className="bg-white">
                    <td className="px-4 py-3">
                      <div className="font-medium">{b.namaTim}</div>
                      <div className="text-xs text-neutral-500">{b.asalSekolah}</div>
                    </td>
                    <td className="px-4 py-3">{b.jenjang}</td>
                    <td className="px-4 py-3">
                      {b.confirmed ? (
                        <span className="text-xs text-green-700">Terverifikasi</span>
                      ) : (
                        <span className="text-xs text-neutral-500">Belum terverifikasi</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold rounded px-2 py-0.5 ${s.kelas}`}>{s.teks}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600">
                      {b.lunas > 0 && <div>{b.lunas} lunas</div>}
                      {b.menunggu > 0 && <div>{b.menunggu} menunggu</div>}
                      {b.lunas === 0 && b.menunggu === 0 && "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
