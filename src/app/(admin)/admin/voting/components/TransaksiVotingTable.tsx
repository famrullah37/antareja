"use client";

import { rejectVoting, verifikasiVoting } from "@/actions/Voting";
import { toast } from "sonner";

type TransaksiWithRelations = {
  id: string;
  nama: string;
  email: string;
  noHp: string;
  jumlahVote: number;
  hargaSatuan: number;
  totalBayar: number;
  kodeUnik: string;
  status: string;
  bukti: string | null;
  createdAt: Date;
  tim: { nama_tim: string; asal_sekolah: string };
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

export default function TransaksiVotingTable({
  transaksis,
}: {
  transaksis: TransaksiWithRelations[];
}) {
  async function handleVerifikasi(tr: TransaksiWithRelations) {
    const confirmed = window.confirm(
      `Cek dulu bukti transfer: dana yang masuk HARUS tepat ${formatRupiah(tr.totalBayar)} ` +
      `(${tr.jumlahVote} vote × ${formatRupiah(tr.hargaSatuan)} + kode unik ${tr.kodeUnik}).\n\n` +
      `Jika dana yang masuk kurang dari nominal itu, JANGAN verifikasi — tolak transaksi ini dan minta ` +
      `pendukung mengirim ulang dengan jumlah vote yang sesuai dana yang benar-benar ditransfer.\n\n` +
      `Dana sudah dicek sesuai dan ingin melanjutkan verifikasi ${tr.jumlahVote} vote ini?`
    );
    if (!confirmed) return;
    const toastId = toast.loading("Memverifikasi...");
    const result = await verifikasiVoting(tr.id);
    if (result.success) toast.success("Dukungan diverifikasi!", { id: toastId });
    else toast.error(result.message ?? "Gagal verifikasi", { id: toastId });
  }

  async function handleReject(id: string) {
    const toastId = toast.loading("Menolak...");
    const result = await rejectVoting(id);
    if (result.success) toast.success("Dukungan ditolak", { id: toastId });
    else toast.error("Gagal", { id: toastId });
  }

  if (!transaksis.length)
    return <p className="text-gray-400 text-sm">Belum ada transaksi dukungan.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-neutral-600">
          <tr>
            <th className="px-4 py-3 text-left">Pendukung</th>
            <th className="px-4 py-3 text-left">Tim</th>
            <th className="px-4 py-3 text-left">Jml Vote</th>
            <th className="px-4 py-3 text-left">Total Bayar</th>
            <th className="px-4 py-3 text-left">No. Urut</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Bukti</th>
            <th className="px-4 py-3 text-left">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {transaksis.map((tr) => (
            <tr key={tr.id} className="bg-white">
              <td className="px-4 py-3">
                <div className="font-medium">{tr.nama}</div>
                <div className="text-gray-400 text-xs">{tr.email}</div>
              </td>
              <td className="px-4 py-3">
                <div>{tr.tim.nama_tim}</div>
                <div className="text-gray-400 text-xs">{tr.tim.asal_sekolah}</div>
              </td>
              <td className="px-4 py-3">{tr.jumlahVote}×</td>
              <td className="px-4 py-3">
                <div className="font-semibold">{formatRupiah(tr.totalBayar)}</div>
                <div className="text-gray-400 text-xs">
                  {formatRupiah(tr.hargaSatuan)} × {tr.jumlahVote}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="font-mono font-bold text-primary-600 tracking-widest">{tr.kodeUnik}</span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge[tr.status] ?? ""}`}
                >
                  {tr.status}
                </span>
              </td>
              <td className="px-4 py-3">
                {tr.bukti ? (
                  <a
                    href={tr.bukti}
                    target="_blank"
                    className="text-blue-500 hover:underline text-xs"
                  >
                    Lihat
                  </a>
                ) : (
                  <span className="text-gray-300 text-xs">-</span>
                )}
              </td>
              <td className="px-4 py-3">
                {tr.status === "PENDING" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVerifikasi(tr)}
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
