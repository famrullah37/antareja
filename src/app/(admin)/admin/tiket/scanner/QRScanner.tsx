"use client";

import { scanQRTiket } from "@/actions/Tiket";
import { useState } from "react";

export default function QRScanner() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    data?: { nama: string; jenis: string; waktuScan: string };
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    setLoading(true);
    const res = await scanQRTiket(token.trim());
    setResult(res as typeof result);
    setLoading(false);
    setToken("");
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleScan} className="flex flex-col gap-3">
        <label className="font-medium text-sm">Token QR / Scan Barcode</label>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Scan atau ketik token QR..."
          className="border border-neutral-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-primary-500 text-white rounded-xl py-3 font-semibold hover:bg-primary-600 transition-colors disabled:opacity-60"
        >
          {loading ? "Memvalidasi..." : "Validasi Tiket"}
        </button>
      </form>

      {result && (
        <div
          className={`rounded-xl p-5 border-2 ${
            result.success
              ? "border-green-400 bg-green-50"
              : "border-red-400 bg-red-50"
          }`}
        >
          {result.success && result.data ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-green-700 font-bold text-lg">
                <span>✅</span> Tiket Valid
              </div>
              <div className="text-sm text-neutral-700 flex flex-col gap-1">
                <div>
                  <span className="font-medium">Nama:</span> {result.data.nama}
                </div>
                <div>
                  <span className="font-medium">Jenis:</span>{" "}
                  {result.data.jenis}
                </div>
                <div>
                  <span className="font-medium">Waktu Scan:</span>{" "}
                  {new Date(result.data.waktuScan).toLocaleString("id-ID")}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-700 font-semibold">
              <span>❌</span> {result.message ?? "Tiket tidak valid"}
            </div>
          )}
        </div>
      )}

      <div className="bg-neutral-50 rounded-xl p-4 text-xs text-gray-500">
        <p className="font-medium mb-1">Petunjuk:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Scan QR Code pengunjung menggunakan kamera barcode scanner</li>
          <li>Atau ketik token QR secara manual lalu tekan Validasi</li>
          <li>Tiket yang sudah di-scan tidak bisa dipakai ulang</li>
        </ul>
      </div>
    </div>
  );
}
