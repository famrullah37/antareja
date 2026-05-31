"use client";

import { deleteTiketAdmin } from "@/actions/Tiket";
import { Tiket } from "@prisma/client";
import { toast } from "sonner";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

export default function TiketMasterTable({ tikets }: { tikets: Tiket[] }) {
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
