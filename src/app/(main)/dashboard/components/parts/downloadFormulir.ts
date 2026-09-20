"use client";

import { toast } from "sonner";
import { downloadFormulirPdf } from "@/actions/Tim";

// Generate berkas registrasi PDF di server lalu picu unduhan di browser.
// Mengembalikan true kalau berhasil terunduh.
export async function downloadFormulir(): Promise<boolean> {
  const toastId = toast.loading("Menyiapkan berkas registrasi...");
  try {
    const result = await downloadFormulirPdf();
    if (!result.success || !result.base64) {
      toast.error(result.message ?? "Gagal membuat berkas registrasi", { id: toastId });
      return false;
    }

    const bytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = result.filename ?? "Berkas-Registrasi.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Berkas registrasi berhasil diunduh", { id: toastId });
    return true;
  } catch {
    toast.error("Gagal mengunduh berkas registrasi", { id: toastId });
    return false;
  }
}
