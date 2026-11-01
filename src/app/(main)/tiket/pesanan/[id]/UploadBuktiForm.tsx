"use client";

import { uploadBuktiTiket } from "@/actions/Tiket";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function UploadBuktiForm({ id, t, buktiUrl }: { id: string; t: string; buktiUrl: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function kirim(data: FormData) {
    setLoading(true);
    const toastId = toast.loading("Mengunggah bukti...");
    try {
      const r = await uploadBuktiTiket(data);
      if (r.success) {
        toast.success("Bukti pembayaran terkirim ke panitia", { id: toastId });
        router.refresh();
      } else toast.error(r.message ?? "Gagal mengunggah bukti", { id: toastId });
    } catch {
      toast.error("Koneksi terputus, coba lagi", { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={kirim} className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="t" value={t} />
      <h2 className="font-semibold">{buktiUrl ? "Bukti pembayaran" : "Upload bukti pembayaran"}</h2>
      {buktiUrl ? (
        <p className="text-sm text-green-700">
          ✓ Bukti sudah terkirim.{" "}
          <a href={buktiUrl} target="_blank" rel="noreferrer" className="underline">
            Lihat bukti
          </a>{" "}
          — unggah lagi hanya kalau ingin menggantinya.
        </p>
      ) : (
        <p className="text-sm text-gray-500">
          Unggah screenshot/foto bukti pembayaran supaya panitia lebih cepat memverifikasi pesanan Anda.
        </p>
      )}
      <input
        name="bukti"
        type="file"
        accept="image/*"
        required
        className="border border-gray-200 py-3 px-3 rounded-xl file:bg-primary-500 file:text-white file:rounded-md file:border-none file:py-1 hover:cursor-pointer"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-semibold rounded-xl py-3"
      >
        {loading ? "Mengunggah..." : buktiUrl ? "Ganti Bukti" : "Kirim Bukti"}
      </button>
    </form>
  );
}
