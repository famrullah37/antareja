"use client";

import { exportDataTim } from "@/actions/Tim";
import { saveBase64File } from "@/lib/saveFile";
import { useState } from "react";
import { toast } from "sonner";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// timId kosong = semua tim. File Excel berisi data tim & anggota tanpa foto.
export default function ExportDataTimButton({ timId, label }: Readonly<{ timId?: string; label: string }>) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const toastId = toast.loading("Menyiapkan file Excel...");
    try {
      const result = await exportDataTim(timId);
      if (!result.success || !result.base64) {
        toast.error(result.message ?? "Gagal membuat file Excel", { id: toastId });
        return;
      }
      saveBase64File(result.base64, result.filename ?? "Data-Tim.xlsx", XLSX_MIME);
      toast.success("File Excel berhasil diunduh", { id: toastId });
    } catch {
      toast.error("Gagal mengunduh file Excel", { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
    >
      {loading ? "Menyiapkan..." : label}
    </button>
  );
}
