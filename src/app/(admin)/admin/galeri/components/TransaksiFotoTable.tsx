"use client";

import { rejectFoto, verifikasiFoto } from "@/actions/Galeri";
import { toast } from "sonner";

type TransaksiFotoItem = {
  id: string;
  namaPembeli: string | null;
  paket: string | null;
  harga: number;
  status: string;
  bukti: string;
  kodeUnik: string | null;
  email: string | null;
  createdAt: Date;
  fotoList: unknown;
  expiredAt: Date | null;
  user: { nama: string; email: string } | null;
};

const statusBadge: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  VERIFIED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

export default function TransaksiFotoTable({
  transaksis,
}: {
  transaksis: TransaksiFotoItem[];
}) {
  async function handleVerifikasi(id: string) {
    const toastId = toast.loading("Memverifikasi...");
    const result = await verifikasiFoto(id);
    if (result.success)
      toast.success("Akses foto diaktifkan!", { id: toastId });
    else toast.error("Gagal", { id: toastId });
  }

  async function handleReject(id: string) {
    const toastId = toast.loading("Menolak...");
    const result = await rejectFoto(id);
    if (result.success) toast.success("Ditolak", { id: toastId });
    else toast.error("Gagal", { id: toastId });
  }

  if (transaksis.length === 0) {
    return <p className="text-gray-400 text-sm">Belum ada transaksi foto.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-neutral-600">
          <tr>
            <th className="px-4 py-3 text-left">Pembeli</th>
            <th className="px-4 py-3 text-left">Kode Unik</th>
            <th className="px-4 py-3 text-left">Jml Foto</th>
            <th className="px-4 py-3 text-left">Harga</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Bukti</th>
            <th className="px-4 py-3 text-left">Expired</th>
            <th className="px-4 py-3 text-left">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {transaksis.map((tr) => (
            <tr key={tr.id} className="bg-white">
              <td className="px-4 py-3">
                <div className="font-medium">
                  {tr.namaPembeli ?? tr.user?.nama ?? "Guest"}
                </div>
                <div className="text-xs text-gray-400">
                  {tr.email ?? tr.user?.email ?? "-"}
                </div>
              </td>
              <td className="px-4 py-3">
                {tr.kodeUnik ? (
                  <span className="font-mono font-bold text-primary-600 tracking-widest">{tr.kodeUnik}</span>
                ) : (
                  <span className="text-gray-300 text-xs">-</span>
                )}
              </td>
              <td className="px-4 py-3">
                {(tr.fotoList as string[]).length}
              </td>
              <td className="px-4 py-3">{formatRupiah(tr.harga)}</td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge[tr.status] ?? ""}`}
                >
                  {tr.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <a
                  href={tr.bukti}
                  target="_blank"
                  className="text-blue-500 hover:underline text-xs"
                >
                  Lihat
                </a>
              </td>
              <td className="px-4 py-3 text-xs text-gray-400">
                {tr.expiredAt
                  ? new Date(tr.expiredAt).toLocaleDateString("id-ID")
                  : "-"}
              </td>
              <td className="px-4 py-3">
                {tr.status === "PENDING" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVerifikasi(tr.id)}
                      className="bg-green-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-green-600 transition-colors"
                    >
                      Verifikasi
                    </button>
                    <button
                      onClick={() => handleReject(tr.id)}
                      className="bg-red-100 text-red-600 px-3 py-1 rounded-lg text-xs hover:bg-red-200 transition-colors"
                    >
                      Tolak
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
