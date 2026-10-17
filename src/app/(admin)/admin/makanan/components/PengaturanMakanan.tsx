"use client";

import { setPengaturanMakanan } from "@/actions/Makanan";
import { useRouter } from "next-nprogress-bar";
import { useState } from "react";
import { toast } from "sonner";

const inputCls =
  "border border-neutral-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400";

export default function PengaturanMakanan({ aktif, info }: { aktif: boolean; info: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handle(data: FormData) {
    setLoading(true);
    const toastId = toast.loading("Menyimpan...");
    const result = await setPengaturanMakanan(data);
    setLoading(false);
    if (result.success) {
      toast.success("Pengaturan disimpan", { id: toastId });
      router.refresh();
    } else {
      toast.error(result.message ?? "Gagal menyimpan", { id: toastId });
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6">
      <h2 className="font-semibold text-lg mb-1">Pengaturan</h2>
      <p className="text-sm text-gray-500 mb-4">
        Kalau dibuka, form pemesanan muncul di dashboard tim yang pembayarannya sudah diverifikasi. Pembayaran lewat
        QRIS dinamis dengan nominal persis (subtotal + kode unik 3 digit) — QRIS diambil dari pengaturan di halaman
        Tiket. Cocokkan nominal di riwayat QRIS sebelum verifikasi. Keterangan ditampilkan di atas form (mis. lokasi
        stand pengambilan).
      </p>
      <form action={handle} className="flex flex-col gap-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="aktif" defaultChecked={aktif} className="w-4 h-4 accent-primary-500" />
          Buka pemesanan makanan
        </label>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Keterangan untuk tim</label>
          <textarea
            name="info"
            rows={3}
            maxLength={2000}
            defaultValue={info ?? ""}
            placeholder="Makanan diambil di stand konsumsi dekat lapangan utama, 30 menit sebelum jam makan..."
            className={inputCls}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="self-start bg-primary-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-60"
        >
          {loading ? "Menyimpan..." : "Simpan"}
        </button>
      </form>
    </div>
  );
}
