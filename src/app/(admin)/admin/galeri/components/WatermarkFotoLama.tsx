"use client";

import { buatWatermarkFotoLama } from "@/actions/Galeri";
import { useRouter } from "next-nprogress-bar";
import { useState } from "react";
import { toast } from "sonner";

// Panel untuk foto lama yang preview-nya belum ber-watermark (lihat
// buatWatermarkFotoLama). Hilang sendiri kalau semua foto sudah diproses.
export default function WatermarkFotoLama({ jumlah }: { jumlah: number }) {
  const router = useRouter();
  const [sisa, setSisa] = useState(jumlah);
  const [loading, setLoading] = useState(false);

  if (sisa === 0) return null;

  async function proses() {
    setLoading(true);
    const toastId = toast.loading("Membuat watermark...");
    try {
      const r = await buatWatermarkFotoLama();
      setSisa(r.sisa);
      if (r.success) toast.success(`${r.berhasil} foto diberi watermark · sisa ${r.sisa}`, { id: toastId });
      else toast.error(`${r.berhasil} berhasil, ${r.message}`, { id: toastId, duration: 8000 });
      router.refresh();
    } catch {
      toast.error("Gagal memproses — coba lagi", { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
      <div className="text-sm text-amber-900">
        <p className="font-semibold">{sisa} foto belum punya preview ber-watermark</p>
        <p>
          Preview foto ini di album berbayar masih sama dengan file aslinya. Proses dikerjakan 10 foto per klik — klik
          lagi sampai habis.
        </p>
      </div>
      <button
        type="button"
        onClick={proses}
        disabled={loading}
        className="bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-700 disabled:opacity-60"
      >
        {loading ? "Memproses..." : "Buat Watermark"}
      </button>
    </div>
  );
}
