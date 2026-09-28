"use client";

import { deleteTiketAdmin, updateBundlingTiket } from "@/actions/Tiket";
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
            <th className="px-4 py-3 text-left">Bundling</th>
            <th className="px-4 py-3 text-left">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {tikets.map((t) => (
            <tr key={t.id} className="bg-white">
              <td className="px-4 py-3 font-medium">{t.jenis}</td>
              <td className="px-4 py-3">{formatRupiah(t.harga)}</td>
              <td className="px-4 py-3">{t.kuota}</td>
              <td className="px-4 py-3">{t.sisa}</td>
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
