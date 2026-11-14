"use client";

import { exportDataVoting } from "@/actions/Voting";
import { saveBase64File } from "@/lib/saveFile";
import { useState } from "react";
import { toast } from "sonner";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Excel detail voting: Ringkasan, Rekap per kategori (per tim), dan Transaksi.
export default function ExportVotingButton() {
  const [loading, setLoading] = useState(false);
  const [jenjang, setJenjang] = useState("");

  async function handleClick() {
    setLoading(true);
    const toastId = toast.loading("Menyiapkan file Excel...");
    try {
      const result = await exportDataVoting(jenjang || undefined);
      if (!result.success || !result.base64) {
        toast.error(result.message ?? "Gagal membuat file Excel", { id: toastId });
        return;
      }
      saveBase64File(result.base64, result.filename ?? "Rekap-Voting.xlsx", XLSX_MIME);
      toast.success("File Excel berhasil diunduh", { id: toastId });
    } catch {
      toast.error("Gagal mengunduh file Excel", { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={jenjang}
        onChange={(e) => setJenjang(e.target.value)}
        disabled={loading}
        aria-label="Jenjang yang diexport"
        className="border border-neutral-300 rounded-lg text-sm px-3 py-2.5 bg-white"
      >
        <option value="">Semua Jenjang</option>
        <option value="SD">SD</option>
        <option value="SMP">SMP</option>
        <option value="SMA">SMA</option>
        <option value="PURNA">Purna</option>
      </select>
      <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
    >
      {loading ? "Menyiapkan..." : "Export Excel"}
      </button>
    </div>
  );
}
