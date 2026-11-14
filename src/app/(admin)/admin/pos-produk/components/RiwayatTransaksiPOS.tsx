"use client";

import { batalTransaksiPOS } from "@/actions/PosProduk";
import { CETAK_STRUK_AKTIF, labelMetodePOS, type ItemPOS } from "@/lib/posProduk";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cetakStruk } from "./struk";

type Transaksi = {
  id: string;
  nomor: string;
  items: ItemPOS[];
  total: number;
  metodePembayaran: string;
  uangDiterima: number | null;
  namaPembeli: string | null;
  catatan: string | null;
  kasirNama: string;
  status: string;
  batalAlasan: string | null;
  batalOleh: string | null;
  createdAt: string;
};

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export default function RiwayatTransaksiPOS({ transaksi }: { transaksi: Transaksi[] }) {
  const [cari, setCari] = useState("");
  const [pending, startTransition] = useTransition();

  const q = cari.trim().toLowerCase();
  const tampil = q
    ? transaksi.filter(
        (t) =>
          t.nomor.toLowerCase().includes(q) ||
          (t.namaPembeli ?? "").toLowerCase().includes(q) ||
          t.kasirNama.toLowerCase().includes(q) ||
          t.items.some((i) => i.nama.toLowerCase().includes(q))
      )
    : transaksi;

  function batal(t: Transaksi) {
    const alasan = window.prompt(`Batalkan ${t.nomor} (${rp(t.total)})?\nStok dikembalikan & catatan kas dihapus.\n\nAlasan:`);
    if (alasan === null) return;
    if (!alasan.trim()) return toast.error("Alasan wajib diisi");
    startTransition(async () => {
      const r = await batalTransaksiPOS(t.id, alasan);
      if (r.success) toast.success(`${t.nomor} dibatalkan`);
      else toast.error(r.message ?? "Gagal membatalkan");
    });
  }

  if (transaksi.length === 0) return <p className="text-gray-500 text-sm">Belum ada transaksi.</p>;

  return (
    <div className="flex flex-col gap-3">
      <input
        value={cari}
        onChange={(e) => setCari(e.target.value)}
        placeholder="Cari nomor, pembeli, kasir, atau produk..."
        className="border border-neutral-300 rounded-lg px-3 py-2 text-sm max-w-md"
      />
      <div className="overflow-x-auto rounded-xl border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-3 py-2 text-left">No.</th>
              <th className="px-3 py-2 text-left">Waktu</th>
              <th className="px-3 py-2 text-left">Barang</th>
              <th className="px-3 py-2 text-left">Bayar</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {tampil.map((t) => (
              <tr key={t.id} className="align-top">
                <td className="px-3 py-2 font-mono whitespace-nowrap">{t.nomor}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(t.createdAt).toLocaleString("id-ID", {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
                  })}
                </td>
                <td className="px-3 py-2">
                  {t.items.map((i) => `${i.nama}${i.varian ? ` (${i.varian})` : ""} ×${i.jumlah}`).join(", ")}
                  <span className="block text-xs text-gray-500">
                    Kasir: {t.kasirNama}
                    {t.namaPembeli ? ` · Pembeli: ${t.namaPembeli}` : ""}
                    {t.catatan ? ` · ${t.catatan}` : ""}
                  </span>
                </td>
                <td className="px-3 py-2">{labelMetodePOS(t.metodePembayaran)}</td>
                <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{rp(t.total)}</td>
                <td className="px-3 py-2">
                  {t.status === "BATAL" ? (
                    <span className="text-xs">
                      <span className="bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">BATAL</span>
                      <span className="block text-gray-500 mt-1">
                        {t.batalAlasan} — {t.batalOleh}
                      </span>
                    </span>
                  ) : (
                    <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">SELESAI</span>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right">
                  {t.status === "SELESAI" && (
                    <div className="flex gap-3 justify-end">
                      {CETAK_STRUK_AKTIF && (
                        <button type="button" onClick={() => cetakStruk(t)} className="text-xs text-primary-600 hover:underline">
                          Struk
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => batal(t)}
                        className="text-xs text-red-600 hover:underline disabled:opacity-50"
                      >
                        Batalkan
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
