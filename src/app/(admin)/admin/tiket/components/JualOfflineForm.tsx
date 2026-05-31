"use client";

import { jualTiketOffline } from "@/actions/Tiket";
import { toast } from "sonner";
import { useState } from "react";

type Tiket = { id: string; jenis: string; harga: number; sisa: number };

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

export default function JualOfflineForm({ tikets }: { tikets: Tiket[] }) {
  const [selectedTiketId, setSelectedTiketId] = useState(tikets[0]?.id ?? "");
  const [jumlah, setJumlah] = useState(1);
  const [metode, setMetode] = useState<"CASH" | "TRANSFER" | "QRIS">("CASH");

  const selectedTiket = tikets.find((t) => t.id === selectedTiketId);
  const total = selectedTiket ? selectedTiket.harga * jumlah : 0;

  async function handleSubmit(data: FormData) {
    const toastId = toast.loading("Memproses penjualan...");
    const result = await jualTiketOffline(data);
    if (result.success) {
      toast.success("Tiket berhasil dijual! QR langsung aktif.", {
        id: toastId,
      });
      setJumlah(1);
    } else {
      toast.error("Gagal menjual tiket", { id: toastId });
    }
  }

  if (!tikets.length)
    return (
      <p className="text-gray-400 text-sm">
        Belum ada jenis tiket tersedia.
      </p>
    );

  return (
    <form
      action={handleSubmit}
      className="bg-white rounded-xl border border-orange-200 p-6 flex flex-col gap-4 max-w-lg"
    >
      <div className="flex items-center gap-2">
        <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-1 rounded-full">
          OFFLINE
        </span>
        <h3 className="font-semibold text-lg">Jual Langsung</h3>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-neutral-700">
          Jenis Tiket
        </label>
        <select
          name="tiketId"
          value={selectedTiketId}
          onChange={(e) => setSelectedTiketId(e.target.value)}
          className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
          required
        >
          {tikets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.jenis} — {formatRupiah(t.harga)} (sisa {t.sisa})
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-neutral-700">
          Nama Pembeli
        </label>
        <input
          name="nama"
          type="text"
          required
          placeholder="Nama lengkap"
          className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-700">No. HP</label>
          <input
            name="noHp"
            type="text"
            placeholder="Opsional"
            className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-700">Jumlah</label>
          <input
            name="jumlah"
            type="number"
            min={1}
            max={selectedTiket?.sisa ?? 1}
            value={jumlah}
            onChange={(e) => setJumlah(parseInt(e.target.value) || 1)}
            required
            className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Metode Pembayaran */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-neutral-700">Metode Pembayaran</label>
        <div className="flex gap-2">
          {(["CASH", "TRANSFER", "QRIS"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMetode(m)}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                metode === m ? "border-orange-500 bg-orange-50 text-orange-700" : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
              }`}>
              {m}
            </button>
          ))}
        </div>
        <input type="hidden" name="metodePembayaran" value={metode} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-neutral-700">
          Catatan (opsional)
        </label>
        <input
          name="catatanAdmin"
          type="text"
          placeholder="Contoh: Bayar tunai di loket"
          className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* Total */}
      {total > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-neutral-600">Total pembayaran</span>
          <span className="font-bold text-orange-700 text-lg">
            {formatRupiah(total)}
          </span>
        </div>
      )}

      <button
        type="submit"
        className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg py-2.5 transition-colors"
      >
        Jual & Aktifkan QR
      </button>
    </form>
  );
}
