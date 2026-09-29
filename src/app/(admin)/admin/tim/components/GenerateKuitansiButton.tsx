"use client";

import { generateKuitansiManual } from "@/actions/pembayaran";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";

// Buat ulang kuitansi & kirim ke email akun tim (hanya untuk tim terkonfirmasi).
// Kuitansi urusan keuangan: disembunyikan untuk staf lain (mis. Sie Lomba),
// sama seperti guard di generateKuitansiManual.
export default function GenerateKuitansiButton({ timId }: Readonly<{ timId: string }>) {
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();
  if (!["ADMIN", "BENDAHARA"].includes(session?.user?.role ?? "")) return null;

  async function handleClick() {
    setLoading(true);
    const toastId = toast.loading("Membuat kuitansi & mengirim email...");
    try {
      const result = await generateKuitansiManual(timId);
      if (result.success) {
        toast.success(
          result.message ? `Kuitansi terkirim ke email. Catatan: ${result.message}` : "Kuitansi berhasil dibuat & dikirim!",
          { id: toastId, duration: result.message ? 8000 : 4000 }
        );
      } else {
        toast.error(result.message ?? "Gagal generate kuitansi", { id: toastId, duration: 8000 });
      }
    } catch {
      toast.error("Gagal generate kuitansi", { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="border border-primary-500 text-primary-600 hover:bg-primary-50 disabled:opacity-60 text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
    >
      {loading ? "Memproses..." : "Generate Kuitansi"}
    </button>
  );
}
