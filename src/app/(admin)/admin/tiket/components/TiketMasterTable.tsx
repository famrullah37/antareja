"use client";

import { deleteTiketAdmin, setKhususTimTiket, tambahKuotaTiket, updateBundlingTiket } from "@/actions/Tiket";
import { Tiket } from "@prisma/client";
import { useState } from "react";
import { toast } from "sonner";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

export default function TiketMasterTable({ tikets }: { tikets: Tiket[] }) {
  const [editBundling, setEditBundling] = useState<string | null>(null);

  async function handleSaveBundling(data: FormData, id: string) {
    const toastId = toast.loading("Menyimpan bundling...");
    const result = await updateBundlingTiket(data, id);
    if (result.success) {
      toast.success("Bundling disimpan", { id: toastId });
      setEditBundling(null);
    } else toast.error("Gagal menyimpan bundling", { id: toastId });
  }

  const [editKuota, setEditKuota] = useState<string | null>(null);

  async function handleTambahKuota(data: FormData, id: string) {
    const tambahan = parseInt((data.get("tambahan") as string) || "0");
    const toastId = toast.loading("Menambah kuota...");
    const result = await tambahKuotaTiket(id, tambahan);
    if (result.success) {
      toast.success(`Kuota ditambah ${tambahan} tiket`, { id: toastId });
      setEditKuota(null);
    } else toast.error(result.message ?? "Gagal menambah kuota", { id: toastId });
  }

  const [editWajib, setEditWajib] = useState<string | null>(null);

  async function handleSaveWajib(data: FormData, id: string) {
    const khususTim = data.get("khususTim") === "on";
    const jumlahPerTim = parseInt((data.get("jumlahPerTim") as string) || "1");
    const toastId = toast.loading("Menyimpan...");
    const result = await setKhususTimTiket(id, khususTim, jumlahPerTim);
    if (result.success) {
      toast.success(
        khususTim ? `Tiket wajib tim: ${jumlahPerTim} tiket per tim` : "Tiket kini terbuka untuk umum",
        { id: toastId }
      );
      setEditWajib(null);
    } else toast.error(result.message ?? "Gagal menyimpan", { id: toastId });
  }

  async function handleDelete(id: string) {
    const toastId = toast.loading("Menghapus...");
    const result = await deleteTiketAdmin(id);
    if (result.success) toast.success("Berhasil dihapus", { id: toastId });
    else toast.error("Gagal menghapus", { id: toastId });
  }

  if (!tikets.length)
    return (
      <p className="text-gray-400 text-sm">Belum ada jenis tiket.</p>
    );

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-neutral-600">
          <tr>
            <th className="px-4 py-3 text-left">Jenis</th>
            <th className="px-4 py-3 text-left">Harga</th>
            <th className="px-4 py-3 text-left">Kuota</th>
            <th className="px-4 py-3 text-left">Sisa</th>
            <th className="px-4 py-3 text-left">Pembeli</th>
            <th className="px-4 py-3 text-left">Bundling</th>
            <th className="px-4 py-3 text-left">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {tikets.map((t) => (
            <tr key={t.id} className="bg-white">
              <td className="px-4 py-3 font-medium">{t.jenis}</td>
              <td className="px-4 py-3">{formatRupiah(t.harga)}</td>
              <td className="px-4 py-3">
                {editKuota === t.id ? (
                  <form action={(data) => handleTambahKuota(data, t.id)} className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-neutral-500">{t.kuota} +</span>
                    <input
                      name="tambahan"
                      type="number"
                      min={1}
                      max={10000}
                      required
                      autoFocus
                      className="border border-neutral-200 rounded-lg px-2 py-1 text-xs w-20"
                    />
                    <button type="submit" className="text-green-600 hover:underline text-xs">
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditKuota(null)}
                      className="text-neutral-500 hover:underline text-xs"
                    >
                      Batal
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>{t.kuota}</span>
                    <button onClick={() => setEditKuota(t.id)} className="text-blue-500 hover:underline text-xs">
                      + Tambah
                    </button>
                  </div>
                )}
              </td>
              <td className={`px-4 py-3 ${t.sisa <= 0 ? "font-semibold text-red-600" : ""}`}>
                {t.sisa <= 0 ? "Habis" : t.sisa}
              </td>
              <td className="px-4 py-3">
                {editWajib === t.id ? (
                  <form action={(data) => handleSaveWajib(data, t.id)} className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1 text-xs">
                      <input type="checkbox" name="khususTim" defaultChecked={t.khususTim} />
                      Wajib tim
                    </label>
                    <input
                      name="jumlahPerTim"
                      type="number"
                      min={1}
                      defaultValue={t.jumlahPerTim}
                      className="border border-neutral-200 rounded-lg px-2 py-1 text-xs w-16"
                    />
                    <span className="text-xs text-neutral-500">/tim</span>
                    <button type="submit" className="text-green-600 hover:underline text-xs">
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditWajib(null)}
                      className="text-neutral-500 hover:underline text-xs"
                    >
                      Batal
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    {t.khususTim ? (
                      <span className="text-xs font-semibold text-primary-700 bg-primary-50 rounded px-2 py-0.5">
                        Wajib tim · {t.jumlahPerTim}/tim
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">Umum</span>
                    )}
                    <button onClick={() => setEditWajib(t.id)} className="text-blue-500 hover:underline text-xs">
                      Ubah
                    </button>
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                {editBundling === t.id ? (
                  <form
                    action={(data) => handleSaveBundling(data, t.id)}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input
                      name="bundleHarga"
                      type="number"
                      min={0}
                      defaultValue={t.bundleHarga ?? ""}
                      placeholder="Rp 5000"
                      className="border border-neutral-200 rounded-lg px-2 py-1 text-xs w-24"
                    />
                    <input
                      name="bundleIsi"
                      type="text"
                      defaultValue={t.bundleIsi ?? ""}
                      placeholder="2 Air Minum"
                      className="border border-neutral-200 rounded-lg px-2 py-1 text-xs w-32"
                    />
                    <button type="submit" className="text-green-600 hover:underline text-xs">
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditBundling(null)}
                      className="text-neutral-500 hover:underline text-xs"
                    >
                      Batal
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    {t.bundleHarga && t.bundleIsi ? (
                      <span className="text-xs">
                        +{formatRupiah(t.bundleHarga)} → {t.bundleIsi}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                    <button
                      onClick={() => setEditBundling(t.id)}
                      className="text-blue-500 hover:underline text-xs"
                    >
                      Atur
                    </button>
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => handleDelete(t.id)}
                  className="text-red-500 hover:underline text-xs"
                >
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
