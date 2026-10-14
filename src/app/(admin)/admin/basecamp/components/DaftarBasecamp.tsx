"use client";

import { setRuanganTim } from "@/actions/Basecamp";
import { STATUS_MENGINAP, type StatusMenginap } from "@/lib/menginap";
import cn from "@/lib/clsx";
import { useRouter } from "next-nprogress-bar";
import { useState } from "react";
import { toast } from "sonner";

type Tim = {
  id: string;
  nama_tim: string;
  asal_sekolah: string;
  jenjang: string;
  confirmed: boolean;
  ruanganId: string | null;
  menginap: { status: string } | null;
};

type Ruangan = { id: string; nama: string; kapasitas: number; terisi: number };

const inputCls =
  "border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400";

function Baris({ t, ruangan }: { t: Tim; ruangan: Ruangan[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const menginap = t.menginap && t.menginap.status in STATUS_MENGINAP ? (t.menginap.status as StatusMenginap) : null;

  async function pindah(ruanganId: string) {
    setLoading(true);
    const result = await setRuanganTim(t.id, ruanganId || null);
    setLoading(false);
    if (result.success) toast.success(`Ruangan ${t.nama_tim} disimpan`);
    else toast.error(result.message ?? "Gagal");
    // Refresh juga saat gagal: jumlah terisi terbaru (mis. diisi admin lain) langsung terlihat.
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
      <div className="flex-1 min-w-[200px]">
        <div className="font-semibold flex flex-wrap items-center gap-2">
          {t.nama_tim}
          {!t.confirmed && <span className="text-xs font-normal text-yellow-700">belum lunas/verifikasi</span>}
          {menginap && (
            <span className={cn("text-xs font-normal border rounded-full px-2 py-0.5", STATUS_MENGINAP[menginap].cls)}>
              Menginap: {STATUS_MENGINAP[menginap].label.toLowerCase()}
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {t.asal_sekolah} · {t.jenjang}
        </div>
      </div>
      <select
        value={t.ruanganId ?? ""}
        disabled={loading}
        onChange={(e) => pindah(e.target.value)}
        className={cn(inputCls, "w-64 disabled:opacity-60", !t.ruanganId && "text-gray-400")}
      >
        <option value="">— Belum ditentukan —</option>
        {ruangan.map((r) => {
          const penuh = r.terisi >= r.kapasitas && r.id !== t.ruanganId;
          return (
            <option key={r.id} value={r.id} disabled={penuh} className="text-gray-900">
              {r.nama} ({r.terisi}/{r.kapasitas}){penuh ? " — penuh" : ""}
            </option>
          );
        })}
      </select>
    </div>
  );
}

export default function DaftarBasecamp({ tims, ruangan }: { tims: Tim[]; ruangan: Ruangan[] }) {
  const [cari, setCari] = useState("");
  const [filter, setFilter] = useState("SEMUA");

  const q = cari.trim().toLowerCase();
  const tampil = tims.filter(
    (t) =>
      (filter === "SEMUA" ||
        (filter === "BELUM" && !t.ruanganId) ||
        (filter === "MENGINAP" && t.menginap?.status === "DISETUJUI") ||
        t.ruanganId === filter) &&
      (!q || [t.nama_tim, t.asal_sekolah].some((s) => s.toLowerCase().includes(q)))
  );

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-100">
        <h2 className="font-semibold text-lg mb-3">Penempatan Tim</h2>
        {ruangan.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-3 text-sm mb-3">
            Tambahkan ruangan dulu sebelum menempatkan tim.
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari tim atau sekolah..."
            className={cn(inputCls, "flex-1 min-w-[200px]")}
          />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className={inputCls}>
            <option value="SEMUA">Semua tim</option>
            <option value="BELUM">Belum punya ruangan</option>
            <option value="MENGINAP">Menginap (disetujui)</option>
            {ruangan.map((r) => (
              <option key={r.id} value={r.id}>
                Di {r.nama}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="divide-y divide-neutral-100">
        {tampil.map((t) => (
          <Baris key={t.id} t={t} ruangan={ruangan} />
        ))}
        {tampil.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-400">
            {tims.length === 0 ? "Belum ada tim terdaftar." : "Tidak ada tim yang cocok."}
          </div>
        )}
      </div>
    </div>
  );
}
