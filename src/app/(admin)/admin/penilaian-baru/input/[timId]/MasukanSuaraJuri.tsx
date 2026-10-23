"use client";

import { hapusMasukanSuara, simpanMasukanSuara } from "@/actions/PenilaianBaru";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Sama dengan MAKS_DURASI_SUARA di actions/PenilaianBaru — pengaman saja,
// juri bebas merekam selama tim tampil.
const MAKS_DETIK = 30 * 60;

// Chrome/Android merekam webm, Safari (iPhone/iPad) hanya mp4.
const TIPE_REKAM = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

function formatDurasi(detik: number) {
  return `${Math.floor(detik / 60)}:${String(detik % 60).padStart(2, "0")}`;
}

type Rekaman = { blob: Blob; url: string; durasi: number };

export default function MasukanSuaraJuri({
  timId,
  juriId,
  existing,
  terkunci,
}: {
  timId: string;
  juriId: string;
  existing: { id: string; durasiDetik: number; v: number } | null;
  terkunci: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"siap" | "merekam" | "menyimpan">("siap");
  const [detik, setDetik] = useState(0);
  const [rekaman, setRekaman] = useState<Rekaman | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  // Juri pindah ke tim lain (komponen dilepas): rekaman dihentikan & langsung disimpan.
  const keluarRef = useRef(false);
  const rekamanRef = useRef<Rekaman | null>(null);
  useEffect(() => {
    rekamanRef.current = rekaman;
  }, [rekaman]);

  async function unggah(blob: Blob, durasi: number) {
    const fd = new FormData();
    const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
    fd.append("audio", blob, `masukan.${ext}`);
    fd.append("durasi", String(durasi));
    fd.append("juriId", juriId);
    return simpanMasukanSuara(timId, fd);
  }

  async function simpanSaatKeluar(blob: Blob, durasi: number) {
    const toastId = toast.loading("Menyimpan rekaman tim sebelumnya...");
    const result = await unggah(blob, durasi);
    if (result.success) toast.success("Rekaman tim sebelumnya tersimpan", { id: toastId });
    else toast.error(`Rekaman tim sebelumnya gagal disimpan: ${result.message ?? "coba rekam ulang"}`, { id: toastId });
  }

  // Peringatkan juri sebelum meninggalkan halaman saat rekaman belum tersimpan.
  const belumTersimpan = status !== "siap" || !!rekaman;
  useEffect(() => {
    if (!belumTersimpan) return;
    const cegah = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", cegah);
    return () => window.removeEventListener("beforeunload", cegah);
  }, [belumTersimpan]);

  useEffect(() => {
    keluarRef.current = false;
    return () => {
      keluarRef.current = true;
      // Sedang merekam: stop → onstop yang menyimpan. Sudah berhenti tapi belum disimpan: simpan di sini.
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      else if (rekamanRef.current) {
        const { blob, url, durasi } = rekamanRef.current;
        URL.revokeObjectURL(url);
        simpanSaatKeluar(blob, durasi);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function mulai() {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Browser ini tidak mendukung perekaman suara");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("Izin mikrofon ditolak. Aktifkan mikrofon di pengaturan browser.");
      return;
    }
    const mimeType = TIPE_REKAM.find((t) => MediaRecorder.isTypeSupported(t));
    const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32000 });
    const potongan: Blob[] = [];
    const mulaiPada = Date.now();
    recorder.ondataavailable = (e) => e.data.size > 0 && potongan.push(e.data);
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
      const blob = new Blob(potongan, { type: recorder.mimeType });
      const durasi = Math.max(1, Math.round((Date.now() - mulaiPada) / 1000));
      if (keluarRef.current) {
        simpanSaatKeluar(blob, durasi);
        return;
      }
      setRekaman({ blob, url: URL.createObjectURL(blob), durasi });
      setStatus("siap");
    };
    // Potong per 10 detik supaya data tidak hilang semua kalau browser bermasalah di tengah.
    recorder.start(10000);
    recorderRef.current = recorder;
    setDetik(0);
    setStatus("merekam");
    timerRef.current = setInterval(() => {
      const s = Math.round((Date.now() - mulaiPada) / 1000);
      setDetik(s);
      if (s >= MAKS_DETIK && recorder.state === "recording") recorder.stop();
    }, 1000);
    // Layar tablet yang mati sendiri bisa menghentikan rekaman.
    try {
      wakeLockRef.current = await (navigator as any).wakeLock?.request("screen");
    } catch {}
  }

  function berhenti() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function buang() {
    if (rekaman) URL.revokeObjectURL(rekaman.url);
    setRekaman(null);
  }

  async function simpan() {
    if (!rekaman) return;
    setStatus("menyimpan");
    const toastId = toast.loading("Mengunggah rekaman...");
    const result = await unggah(rekaman.blob, rekaman.durasi);
    setStatus("siap");
    if (result.success) {
      toast.success("Masukan suara tersimpan", { id: toastId });
      buang();
      router.refresh();
    } else {
      toast.error(result.message ?? "Gagal menyimpan rekaman", { id: toastId });
    }
  }

  async function hapus() {
    if (!confirm("Hapus masukan suara untuk tim ini?")) return;
    const result = await hapusMasukanSuara(timId, juriId);
    if (result.success) {
      toast.success("Masukan suara dihapus");
      router.refresh();
    } else toast.error(result.message ?? "Gagal menghapus");
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5 mb-6 flex flex-col gap-3">
      <div>
        <h2 className="font-semibold text-lg">Masukan Suara</h2>
        <p className="text-sm text-gray-500">
          Rekam masukan lisan untuk tim ini selama penilaian. Tim bisa mendengarnya setelah nilai dipublish.
        </p>
      </div>

      {existing && !rekaman && status !== "merekam" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-600">
            Tersimpan · <b>{formatDurasi(existing.durasiDetik)}</b>
          </p>
          <audio controls preload="none" src={`/api/masukan-suara/${existing.id}?v=${existing.v}`} className="w-full" />
        </div>
      )}

      {terkunci ? (
        <p className="text-sm text-gray-400">Nilai sudah dipublish, masukan suara tidak bisa diubah.</p>
      ) : status === "merekam" ? (
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 text-red-600 font-semibold tabular-nums">
            <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
            {formatDurasi(detik)}
          </span>
          <button
            type="button"
            onClick={berhenti}
            className="bg-neutral-800 hover:bg-black text-white px-6 h-12 rounded-xl font-semibold transition-colors"
          >
            Berhenti
          </button>
        </div>
      ) : rekaman ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600">
            Rekaman baru · <b>{formatDurasi(rekaman.durasi)}</b> (belum tersimpan)
          </p>
          <audio controls src={rekaman.url} className="w-full" />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={simpan}
              disabled={status === "menyimpan"}
              className="bg-primary-500 hover:bg-primary-600 text-white px-6 h-12 rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              {status === "menyimpan" ? "Menyimpan..." : existing ? "Simpan & Ganti" : "Simpan Rekaman"}
            </button>
            <button
              type="button"
              onClick={buang}
              disabled={status === "menyimpan"}
              className="border border-neutral-300 hover:bg-neutral-100 px-6 h-12 rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              Buang
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={mulai}
            className="bg-red-500 hover:bg-red-600 text-white px-6 h-12 rounded-xl font-semibold transition-colors"
          >
            {existing ? "Rekam Ulang" : "Mulai Rekam"}
          </button>
          {existing && (
            <button
              type="button"
              onClick={hapus}
              className="border border-red-300 text-red-600 hover:bg-red-50 px-6 h-12 rounded-xl font-semibold transition-colors"
            >
              Hapus
            </button>
          )}
        </div>
      )}
    </div>
  );
}
