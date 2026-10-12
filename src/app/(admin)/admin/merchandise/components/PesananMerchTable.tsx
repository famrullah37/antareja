"use client";

import { tandaiDiambilMerch, tolakPesananMerch, verifikasiPesananMerch } from "@/actions/Merchandise";
import type { ItemPesanan } from "@/lib/merchandise";
import { useState } from "react";
import { toast } from "sonner";

type Pesanan = {
  id: string;
  nama: string;
  email: string;
  noHp: string;
  items: ItemPesanan[];
  totalBayar: number;
  kodeUnik: string;
  metodePembayaran: string;
  bukti: string | null;
  status: string;
  diambilAt: Date | null;
  createdAt: Date;
};

const statusBadge: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  VERIFIED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  DIAMBIL: "bg-blue-100 text-blue-700",
};

const statusLabel: Record<string, string> = {
  PENDING: "Menunggu",
  VERIFIED: "Lunas",
  REJECTED: "Ditolak",
  DIAMBIL: "Sudah Diambil",
};

function linkWA(p: Pesanan) {
  const msg = [
    `Halo *${p.nama}*,`,
    `Pre-order merchandise LPKBB Antareja 2026 (kode *#${p.kodeUnik}*) sudah kami terima:`,
    ...p.items.map((i) => `• ${i.nama}${i.ukuran ? ` (${i.ukuran})` : ""} × ${i.jumlah}`),
    ``,
    `Terima kasih! — Panitia LPKBB Antareja 2026`,
  ].join("\n");
  const no = p.noHp.replace(/^0/, "62").replace(/\D/g, "");
  return `https://wa.me/${no}?text=${encodeURIComponent(msg)}`;
}

export default function PesananMerchTable({ pesanan }: { pesanan: Pesanan[] }) {
  const [filter, setFilter] = useState<string>("SEMUA");
  const [cari, setCari] = useState("");

  const tampil = pesanan.filter(
    (p) =>
      (filter === "SEMUA" || p.status === filter) &&
      (!cari ||
        p.nama.toLowerCase().includes(cari.toLowerCase()) ||
        p.kodeUnik.includes(cari) ||
        p.noHp.includes(cari))
  );

  async function aksi(fn: (id: string) => Promise<{ success: boolean; message?: string }>, id: string, ok: string) {
    const toastId = toast.loading("Memproses...");
    const r = await fn(id);
    if (r.success) toast.success(ok, { id: toastId });
    else toast.error(r.message ?? "Gagal", { id: toastId });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 items-center">
        {["SEMUA", "PENDING", "VERIFIED", "DIAMBIL", "REJECTED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              filter === s ? "bg-primary-500 text-white border-primary-500" : "bg-white border-neutral-200 text-neutral-600"
            }`}
          >
            {s === "SEMUA" ? "Semua" : statusLabel[s]} (
            {s === "SEMUA" ? pesanan.length : pesanan.filter((p) => p.status === s).length})
          </button>
        ))}
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari nama / kode / no. HP"
          className="border border-neutral-300 rounded-lg px-3 py-1.5 text-sm ml-auto w-full sm:w-64"
        />
      </div>

      {tampil.length === 0 ? (
        <p className="text-gray-400 text-sm">Tidak ada pesanan.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-3 text-left">Pemesan</th>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-left">Total</th>
                <th className="px-4 py-3 text-left">Kode</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Bukti</th>
                <th className="px-4 py-3 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {tampil.map((p) => (
                <tr key={p.id} className="bg-white align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.nama}</div>
                    <div className="text-gray-400 text-xs">{p.email}</div>
                    <div className="text-gray-400 text-xs">{p.noHp}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {p.items.map((i, idx) => (
                      <div key={idx}>
                        {i.nama}
                        {i.ukuran && <b> ({i.ukuran})</b>} × {i.jumlah}
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">Rp{p.totalBayar.toLocaleString("id-ID")}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-primary-600 tracking-widest">{p.kodeUnik}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusBadge[p.status] ?? ""}`}>
                      {statusLabel[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {p.bukti ? (
                      <a href={p.bukti} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        Lihat
                      </a>
                    ) : p.metodePembayaran === "QRIS" ? (
                      <span className="text-gray-400">QRIS (tanpa bukti)</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5 text-xs">
                      {p.status === "PENDING" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => aksi(verifikasiPesananMerch, p.id, "Pesanan diverifikasi")}
                            className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600"
                          >
                            Verifikasi
                          </button>
                          <button
                            onClick={() => aksi(tolakPesananMerch, p.id, "Pesanan ditolak")}
                            className="bg-red-100 text-red-600 px-3 py-1 rounded-lg hover:bg-red-200"
                          >
                            Tolak
                          </button>
                        </div>
                      )}
                      {p.status === "VERIFIED" && (
                        <button
                          onClick={() => aksi(tandaiDiambilMerch, p.id, "Ditandai sudah diambil")}
                          className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600"
                        >
                          Tandai Diambil
                        </button>
                      )}
                      {(p.status === "VERIFIED" || p.status === "DIAMBIL") && p.noHp && (
                        <a
                          href={linkWA(p)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-green-100 text-green-700 px-3 py-1 rounded-lg hover:bg-green-200 text-center"
                        >
                          Kirim WA
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
