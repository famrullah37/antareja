"use client";

import { toast } from "sonner";
import { downloadFormulirPdf } from "@/actions/Tim";
import { downloadKuitansiPdf } from "@/actions/pembayaran";

type PdfResult = { success: boolean; message?: string; base64?: string; filename?: string };

// Minta server membuat PDF lalu picu unduhan di browser. true = berhasil terunduh.
async function runDownload(
  action: () => Promise<PdfResult>,
  text: { loading: string; success: string; fail: string },
  fallbackName: string
): Promise<boolean> {
  const toastId = toast.loading(text.loading);
  try {
    const result = await action();
    if (!result.success || !result.base64) {
      toast.error(result.message ?? text.fail, { id: toastId });
      return false;
    }

    const bytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = result.filename ?? fallbackName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(text.success, { id: toastId });
    return true;
  } catch {
    toast.error(text.fail, { id: toastId });
    return false;
  }
}

export const downloadFormulir = () =>
  runDownload(
    downloadFormulirPdf,
    {
      loading: "Menyiapkan berkas registrasi...",
      success: "Berkas registrasi berhasil diunduh",
      fail: "Gagal mengunduh berkas registrasi",
    },
    "Berkas-Registrasi.pdf"
  );

export const downloadKuitansi = () =>
  runDownload(
    downloadKuitansiPdf,
    {
      loading: "Menyiapkan kuitansi...",
      success: "Kuitansi berhasil diunduh",
      fail: "Gagal mengunduh kuitansi",
    },
    "Kuitansi.pdf"
  );
