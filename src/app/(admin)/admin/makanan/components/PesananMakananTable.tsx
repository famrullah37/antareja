"use client";

import { tandaiDiambilMakanan, tolakPesananMakanan, verifikasiPesananMakanan } from "@/actions/Makanan";
import { STATUS_MAKANAN, type ItemMakanan, type StatusMakanan } from "@/lib/makanan";
import { useRouter } from "next-nprogress-bar";
import { useState } from "react";
import { toast } from "sonner";

type Pesanan = {
  id: string;
  sesiId: string;
  sesiNama: string;
  namaTim: string;
  asalSekolah: string;
  jenjang: string;
  noHp: string;
  items: ItemMakanan[];
  totalBayar: number;
  kodeUnik: string;
  bukti: string | null;
  catatan: string | null;
  catatanAdmin: string | null;
  status: string;
  createdAt: string;
};

const FILTER_STATUS = ["SEMUA", "PENDING", "VERIFIED", "DIAMBIL", "REJECTED"] as const;

export default function PesananMakananTable({
  pesanan,
  sesi,
  bolehVerifikasi,
}: {
  pesanan: Pesanan[];
  sesi: { id: string; nama: string }[];
  bolehVerifikasi: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("SEMUA");
  const [filterSesi, setFilterSesi] = useState("");
  const [cari, setCari] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const q = cari.toLowerCase();
  const perSesi = pesanan.filter((p) => !filterSesi || p.sesiId === filterSesi);
  const tampil = perSesi.filter(
    (p) =>
      (filter === "SEMUA" || p.status === filter) &&
      (!q || p.namaTim.toLowerCase().includes(q) || p.asalSekolah.toLowerCase().includes(q) || p.kodeUnik.includes(q))
  );

  async function aksi(id: string, fn: () => Promise<{ success: boolean; message?: string }>, ok: string) {
    setBusy(id);
    const toastId = toast.loading("Memproses...");
    const r = await fn();
    setBusy(null);
    if (r.success) {
      toast.success(ok, { id: toastId });
      router.refresh();
    } else toast.error(r.message ?? "Gagal", { id: toastId });
  }

  function tolak(p: Pesanan) {
    const alasan = prompt(`Tolak pesanan ${p.namaTim}? Alasan (tampil di dashboard tim):`, "Bukti transfer tidak sesuai");
    if (alasan === null) return;
    aksi(p.id, () => tolakPesananMakanan(p.id, alasan), "Pesanan ditolak");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 items-center">
        {FILTER_STATUS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              filter === s ? "bg-primary-500 text-white border-primary-500" : "bg-white border-neutral-200 text-neutral-600"
            }`}
          >
            {s === "SEMUA" ? "Semua" : STATUS_MAKANAN[s].label} (
            {s === "SEMUA" ? perSesi.length : perSesi.filter((p) => p.status === s).length})
          </button>
        ))}
        <select
          value={filterSesi}
          onChange={(e) => setFilterSesi(e.target.value)}
          className="border border-neutral-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Semua sesi</option>
          {sesi.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nama}
            </option>
          ))}
        </select>
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari tim / sekolah / kode"
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
                <th className="px-4 py-3 text-left">Tim</th>
                <th className="px-4 py-3 text-left">Sesi</th>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-left">Total</th>
                <th className="px-4 py-3 text-left">Kode</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Bukti</th>
                <th className="px-4 py-3 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {tampil.map((p) => {
                const st = STATUS_MAKANAN[p.status as StatusMakanan];
                return (
                  <tr key={p.id} className="bg-white align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.namaTim}</div>
                      <div className="text-gray-400 text-xs">
                        {p.asalSekolah} · {p.jenjang}
                      </div>
                      <div className="text-gray-400 text-xs">{p.noHp}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{p.sesiNama}</td>
                    <td className="px-4 py-3 text-xs">
                      {p.items.map((i) => (
                        <div key={i.menuId}>
                          {i.nama} × {i.jumlah}
                        </div>
                      ))}
                      {p.catatan && <div className="text-gray-400 mt-1">Catatan: {p.catatan}</div>}
                      {p.catatanAdmin && <div className="text-red-500 mt-1">Ditolak: {p.catatanAdmin}</div>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">Rp{p.totalBayar.toLocaleString("id-ID")}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-primary-600 tracking-widest">{p.kodeUnik}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${st?.badge ?? ""}`}>
                        {st?.label ?? p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {p.bukti ? (
                        <a href={p.bukti} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          Lihat
                        </a>
                      ) : (
                        <span className="text-gray-400">QRIS (cek riwayat)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5 text-xs">
                        {p.status === "PENDING" &&
                          (bolehVerifikasi ? (
                            <div className="flex gap-2">
                              <button
                                disabled={busy === p.id}
                                onClick={() => aksi(p.id, () => verifikasiPesananMakanan(p.id), "Pesanan diverifikasi")}
                                className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 disabled:opacity-60"
                              >
                                Verifikasi
                              </button>
                              <button
                                disabled={busy === p.id}
                                onClick={() => tolak(p)}
                                className="bg-red-100 text-red-600 px-3 py-1 rounded-lg hover:bg-red-200 disabled:opacity-60"
                              >
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400">Menunggu Bendahara</span>
                          ))}
                        {p.status === "VERIFIED" && (
                          <button
                            disabled={busy === p.id}
                            onClick={() => aksi(p.id, () => tandaiDiambilMakanan(p.id), "Ditandai sudah diambil")}
                            className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 disabled:opacity-60"
                          >
                            Tandai Diambil
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
