"use client";

import { scanQRTiket, statistikScanTiket } from "@/actions/Tiket";
import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";

type Hasil = {
  success: boolean;
  message?: string;
  nama?: string;
  data?: { nama: string; jenis: string; bundle: string | null; waktuScan: string };
};

// QR yang sama tidak diproses ulang selama jeda ini — kamera membaca QR yang
// masih di depan lensa berkali-kali per detik.
const JEDA_QR_SAMA_MS = 4000;

export default function QRScanner({ statistikAwal }: { statistikAwal: { masuk: number; total: number } }) {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<Hasil | null>(null);
  const [loading, setLoading] = useState(false);
  const [statistik, setStatistik] = useState(statistikAwal);
  const [kameraAktif, setKameraAktif] = useState(false);
  const [kameraError, setKameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sibukRef = useRef(false);
  const terakhirRef = useRef<{ token: string; waktu: number } | null>(null);

  const validasi = useCallback(async (raw: string) => {
    const t = raw.trim();
    if (!t || sibukRef.current) return;
    sibukRef.current = true;
    setLoading(true);
    try {
      const res = (await scanQRTiket(t)) as Hasil;
      setResult(res);
      navigator.vibrate?.(res.success ? 120 : [80, 60, 80]);
      // Penghitung diperbarui di latar — jangan menahan scan berikutnya.
      if (res.success) statistikScanTiket().then(setStatistik).catch(() => {});
    } catch {
      setResult({ success: false, message: "Gagal menghubungi server — cek koneksi internet" });
    } finally {
      setLoading(false);
      sibukRef.current = false;
    }
  }, []);

  const matikanKamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setKameraAktif(false);
  }, []);

  async function nyalakanKamera() {
    setKameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setKameraAktif(true);
    } catch {
      setKameraError("Kamera tidak bisa dibuka. Izinkan akses kamera di browser, atau pakai input manual di bawah.");
    }
  }

  // Pasang stream ke <video> setelah elemennya tampil, lalu baca frame ±5x/detik.
  useEffect(() => {
    if (!kameraAktif) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;
    video.srcObject = streamRef.current;
    video.play().catch(() => {});
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const timer = setInterval(() => {
      if (!ctx || sibukRef.current || video.readyState < 2) return;
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return;
      // Diperkecil supaya cepat di HP; QR tiket cukup besar untuk tetap terbaca.
      const skala = Math.min(1, 640 / Math.max(w, h));
      canvas.width = Math.round(w * skala);
      canvas.height = Math.round(h * skala);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const kode = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
      if (!kode?.data) return;
      const now = Date.now();
      const akhir = terakhirRef.current;
      if (akhir && akhir.token === kode.data && now - akhir.waktu < JEDA_QR_SAMA_MS) return;
      terakhirRef.current = { token: kode.data, waktu: now };
      validasi(kode.data);
    }, 200);

    return () => clearInterval(timer);
  }, [kameraAktif, validasi]);

  // Matikan kamera saat meninggalkan halaman.
  useEffect(() => matikanKamera, [matikanKamera]);

  async function handleManual(e: React.FormEvent) {
    e.preventDefault();
    await validasi(token);
    setToken("");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center justify-between">
        <span className="text-sm text-gray-500">Sudah masuk</span>
        <span className="text-2xl font-bold">
          {statistik.masuk} <span className="text-base font-normal text-gray-400">/ {statistik.total} tiket</span>
        </span>
      </div>

      {result && (
        <div
          role="status"
          className={`rounded-xl p-5 border-2 ${result.success ? "border-green-400 bg-green-50" : "border-red-400 bg-red-50"}`}
        >
          {result.success && result.data ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-green-700 font-bold text-2xl">
                <span>✅</span> Tiket Valid — Silakan Masuk
              </div>
              <div className="text-base text-neutral-700 flex flex-col gap-1">
                <div>
                  <span className="font-medium">Nama:</span> {result.data.nama}
                </div>
                <div>
                  <span className="font-medium">Jenis:</span> {result.data.jenis}
                </div>
                {result.data.bundle && (
                  <div className="bg-amber-100 border border-amber-300 text-amber-900 rounded-lg px-3 py-2 font-semibold">
                    🎁 Berikan bundling: {result.data.bundle}
                  </div>
                )}
                <div className="text-sm text-gray-500">
                  Di-scan {new Date(result.data.waktuScan).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" })} WIB
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-red-700 font-bold text-2xl">
                <span>❌</span> Ditolak
              </div>
              <div className="text-base text-red-700">{result.message ?? "Tiket tidak valid"}</div>
              {result.nama && <div className="text-sm text-red-600">Atas nama: {result.nama}</div>}
            </div>
          )}
        </div>
      )}

      {kameraAktif ? (
        <div className="flex flex-col gap-3">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-[15%] border-4 border-white/80 rounded-2xl pointer-events-none" />
            {loading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-semibold">
                Memvalidasi...
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={matikanKamera}
            className="border border-neutral-300 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-neutral-50"
          >
            Matikan Kamera
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={nyalakanKamera}
          className="bg-primary-500 text-white rounded-xl py-4 font-semibold hover:bg-primary-600 transition-colors"
        >
          📷 Scan dengan Kamera
        </button>
      )}
      <canvas ref={canvasRef} className="hidden" />
      {kameraError && <p className="text-sm text-red-600">{kameraError}</p>}

      <form onSubmit={handleManual} className="flex flex-col gap-3">
        <label className="font-medium text-sm">Input manual / barcode scanner USB</label>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Scan atau ketik token QR..."
          className="border border-neutral-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
        <button
          type="submit"
          disabled={loading}
          className="border border-primary-500 text-primary-600 rounded-xl py-3 font-semibold hover:bg-primary-50 transition-colors disabled:opacity-60"
        >
          {loading ? "Memvalidasi..." : "Validasi Tiket"}
        </button>
      </form>

      <div className="bg-neutral-50 rounded-xl p-4 text-xs text-gray-500">
        <p className="font-medium mb-1">Petunjuk:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Tekan &quot;Scan dengan Kamera&quot;, izinkan kamera, arahkan ke QR di HP/email pengunjung</li>
          <li>Hasil muncul otomatis; HP bergetar (sekali = valid, dua kali = ditolak)</li>
          <li>Barcode scanner USB: klik kolom input manual lalu scan</li>
          <li>Satu QR hanya berlaku untuk satu orang dan tidak bisa dipakai ulang</li>
        </ul>
      </div>
    </div>
  );
}
