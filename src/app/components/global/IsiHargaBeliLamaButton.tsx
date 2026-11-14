"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

type Hasil = { success: boolean; message?: string; barangTerisi?: number; pesananDiubah?: number };

// Tombol isi harga beli pesanan lama yang masih kosong (merchandise, makanan).
// `aksi` = server action yang hanya mengisi item kosong dengan harga beli sekarang.
export default function IsiHargaBeliLamaButton({ aksi, satuan = "barang" }: { aksi: () => Promise<Hasil>; satuan?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function jalankan() {
    if (
      !confirm(
        `Isi harga beli pesanan lama yang masih kosong dengan harga beli saat ini? Pesanan yang sudah punya harga beli tidak diubah.`
      )
    )
      return;
    startTransition(async () => {
      const r = await aksi();
      if (!r.success) return void toast.error(r.message ?? "Gagal");
      if (!r.barangTerisi)
        toast.info("Tidak ada yang bisa diisi — pastikan harga belinya sudah disimpan.");
      else toast.success(`${r.barangTerisi} ${satuan} di ${r.pesananDiubah} pesanan diisi harga belinya`);
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
      {pending ? "Mengisi..." : "Isi harga beli pesanan lama dengan harga sekarang"}
    </button>
  );
}
