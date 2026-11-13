"use client";

import { isiHargaBeliPesananLamaMerch } from "@/actions/Merchandise";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

export default function IsiHargaBeliLamaButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function jalankan() {
    if (
      !confirm(
        "Isi harga beli pesanan lama yang masih kosong dengan harga beli produk saat ini? Pesanan yang sudah punya harga beli tidak diubah."
      )
    )
      return;
    startTransition(async () => {
      const r = await isiHargaBeliPesananLamaMerch();
      if (!r.success) return void toast.error(r.message ?? "Gagal");
      if (r.barangTerisi === 0)
        toast.info("Tidak ada yang bisa diisi — pastikan harga beli produknya sudah disimpan.");
      else toast.success(`${r.barangTerisi} barang di ${r.pesananDiubah} pesanan diisi harga belinya`);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={jalankan}
      disabled={pending}
      className="mt-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
    >
      {pending ? "Mengisi..." : "Isi harga beli pesanan lama dengan harga produk sekarang"}
    </button>
  );
}
