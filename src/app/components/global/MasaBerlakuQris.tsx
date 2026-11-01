"use client";

import { BERLAKU_KODE_MENIT } from "@/lib/kodeUnik";
import { ReactNode, useEffect, useState } from "react";

// Hasil reserveKode* — kodeToken dikirim balik saat pesan supaya server bisa
// menolak QRIS yang kodenya sudah lewat masa berlaku (lib/kodeUnikToken.ts).
export type KodeTerbit = { kodeUnik: string; kodeToken: string; berlakuSampai: number };

const jamWIB = (ms: number) =>
  new Date(ms).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// Bungkus tampilan QRIS: hitung mundur selama kode masih berlaku; lewat batas,
// QRIS disembunyikan dan pembeli diminta membuat kode (dan QRIS) baru.
export default function MasaBerlakuQris({
  berlakuSampai,
  onBuatBaru,
  children,
}: {
  berlakuSampai: number | null;
  onBuatBaru: () => void;
  children: ReactNode;
}) {
  const [sekarang, setSekarang] = useState(() => Date.now());
  useEffect(() => {
    if (berlakuSampai == null) return;
    setSekarang(Date.now());
    const t = setInterval(() => setSekarang(Date.now()), 1000);
    return () => clearInterval(t);
  }, [berlakuSampai]);

  if (berlakuSampai == null) return <>{children}</>;
  const sisa = berlakuSampai - sekarang;

  if (sisa <= 0)
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800 flex flex-col items-center gap-2 text-center">
        <p className="font-semibold">QRIS sudah kedaluwarsa</p>
        <p className="text-xs">
          Kode unik hanya berlaku {BERLAKU_KODE_MENIT} menit. Jangan bayar memakai QRIS lama — buat kode baru untuk
          mendapatkan QRIS yang berlaku. Kalau sudah terlanjur membayar, segera kirim pesanan.
        </p>
        <button
          type="button"
          onClick={onBuatBaru}
          className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-lg"
        >
          Buat kode baru
        </button>
      </div>
    );

  return (
    <div className="flex flex-col gap-1">
      {children}
      <p className={`text-xs text-center ${sisa < 5 * 60 * 1000 ? "text-red-600 font-semibold" : "text-gray-500"}`}>
        QRIS berlaku sampai {jamWIB(berlakuSampai)} WIB · sisa {mmss(sisa)}
      </p>
    </div>
  );
}
