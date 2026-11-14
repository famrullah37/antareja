"use client";

import { KONDISI_TIM, noUrutLabel, type KondisiTim, type RingkasanPresensi } from "@/lib/presensiDp";
import cn from "@/lib/clsx";
import Link from "next/link";
import { useState } from "react";

type Baris = {
  id: string;
  slug: string;
  nama_tim: string;
  asal_sekolah: string;
  jenjang: string;
  noUrut: number | null;
  hadirAt: string | null;
  ringkas: RingkasanPresensi;
  kondisi: KondisiTim;
  labelGugur: string | null;
};

const inputCls =
  "border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400";

const jamWIB = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

export default function DaftarPresensi({ tims }: { tims: Baris[] }) {
  const [cari, setCari] = useState("");
  const [jenjang, setJenjang] = useState("SEMUA");
  const [kondisi, setKondisi] = useState("SEMUA");

  const jenjangList = Array.from(new Set(tims.map((t) => t.jenjang)));
  const q = cari.trim().toLowerCase();
  const tampil = tims.filter(
    (t) =>
      (jenjang === "SEMUA" || t.jenjang === jenjang) &&
      (kondisi === "SEMUA" || t.kondisi === kondisi) &&
      (!q ||
        [t.nama_tim, t.asal_sekolah, noUrutLabel(t.jenjang, t.noUrut)].some((s) => s.toLowerCase().includes(q)))
  );

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-100 flex flex-wrap gap-3">
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari no. urut (SMA-03), tim, atau sekolah..."
          className={cn(inputCls, "flex-1 min-w-[200px]")}
        />
        <select value={jenjang} onChange={(e) => setJenjang(e.target.value)} className={inputCls}>
          <option value="SEMUA">Semua jenjang</option>
          {jenjangList.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>
        <select value={kondisi} onChange={(e) => setKondisi(e.target.value)} className={inputCls}>
          <option value="SEMUA">Semua status</option>
          {(Object.keys(KONDISI_TIM) as KondisiTim[]).map((k) => (
            <option key={k} value={k}>
              {KONDISI_TIM[k].label}
            </option>
          ))}
        </select>
      </div>
      <div className="divide-y divide-neutral-100">
        {tampil.map((t) => (
          <Link
            key={t.id}
            href={`/admin/presensi-dp/${t.slug}`}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3 hover:bg-neutral-50"
          >
            <div className="w-20 shrink-0 font-mono font-semibold text-primary-600">
              {noUrutLabel(t.jenjang, t.noUrut)}
            </div>
            <div className="flex-1 min-w-[180px]">
              <div className="font-semibold">{t.nama_tim}</div>
              <div className="text-sm text-gray-500">{t.asal_sekolah}</div>
            </div>
            {t.hadirAt && (
              <div className="text-sm text-gray-500">
                {t.ringkas.sesuai}/{t.ringkas.total} sesuai{t.ringkas.tidakHadir > 0 && ` · ${t.ringkas.tidakHadir} anggota tidak hadir`} · hadir {jamWIB(t.hadirAt)}
              </div>
            )}
            <span className={cn("text-xs border rounded-full px-2.5 py-1", KONDISI_TIM[t.kondisi].cls)}>
              {t.labelGugur ?? KONDISI_TIM[t.kondisi].label}
            </span>
          </Link>
        ))}
        {tampil.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-400">
            {tims.length === 0 ? "Belum ada tim terkonfirmasi." : "Tidak ada tim yang cocok."}
          </div>
        )}
      </div>
    </div>
  );
}
