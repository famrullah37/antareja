"use client";

import { saveBase64File } from "@/lib/saveFile";
import { useState } from "react";
import { toast } from "sonner";

type Hasil = { success: boolean; message?: string; base64?: string; filename?: string };

// Tombol unduh kuitansi PDF di tabel transaksi admin (tiket / foto).
export default function UnduhKuitansiButton({ id, aksi }: { id: string; aksi: (id: string) => Promise<Hasil> }) {
  const [loading, setLoading] = useState(false);

  async function unduh() {
    setLoading(true);
    const toastId = toast.loading("Membuat kuitansi...");
    try {
      const r = await aksi(id);
      if (!r.success || !r.base64) {
        toast.error(r.message ?? "Gagal membuat kuitansi", { id: toastId });
        return;
      }
      saveBase64File(r.base64, r.filename ?? "Kuitansi.pdf", "application/pdf");
      toast.success("Kuitansi diunduh", { id: toastId });
    } catch {
      toast.error("Gagal mengunduh kuitansi", { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={unduh}
      disabled={loading}
      className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-xs hover:bg-blue-200 transition-colors disabled:opacity-60 whitespace-nowrap"
    >
      {loading ? "Membuat..." : "Kuitansi"}
    </button>
  );
}
