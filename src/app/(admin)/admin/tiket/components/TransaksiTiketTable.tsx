"use client";

import { rejectTiket, verifikasiTiket } from "@/actions/Tiket";
import { toast } from "sonner";

type TransaksiWithRelations = {
  id: string;
  nama: string;
  email: string;
  noHp: string;
  jumlah: number;
  status: string;
  bukti: string | null;
  jenisJual: string;
  kodeUnik: string | null;
  catatanAdmin: string | null;
  createdAt: Date;
  tiket: { jenis: string; harga: number };
  qrTikets: { token: string; statusScan: boolean; waktuScan: Date | null }[];
};

function buildWAMessage(tr: TransaksiWithRelations) {
  const tokens = tr.qrTikets.map((q, i) => `Tiket ${i + 1}: ${q.token}`).join("\n");
  const msg = [
    `✅ *Tiket LKBB Antareja 2026 Terverifikasi!*`,
    ``,
    `Halo *${tr.nama}*,`,
    `Tiket *${tr.tiket.jenis}* (${tr.jumlah} tiket) sudah diverifikasi.`,
    ``,
    `*Token QR:*`,
    tokens || "(belum ada token)",
    ``,
    `Tunjukkan token ini di pintu masuk.`,
    `— LKBB Antareja 2026, SMK Telkom Malang`,
  ].join("\n");
  const no = tr.noHp.replace(/^0/, "62").replace(/\D/g, "");
  return `https://wa.me/${no}?text=${encodeURIComponent(msg)}`;
}

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

export default function TransaksiTiketTable({
  transaksis,
}: {
  transaksis: TransaksiWithRelations[];
}) {
  async function handleVerifikasi(id: string) {
    const toastId = toast.loading("Memverifikasi...");
    const result = await verifikasiTiket(id);
    if (result.success) toast.success("Tiket diverifikasi!", { id: toastId });
    else toast.error("Gagal verifikasi", { id: toastId });
  }

  async function handleReject(id: string) {
    const toastId = toast.loading("Menolak...");
    const result = await rejectTiket(id);
    if (result.success) toast.success("Tiket ditolak", { id: toastId });
    else toast.error("Gagal", { id: toastId });
  }

  if (!transaksis.length)
    return <p className="text-gray-400 text-sm">Belum ada transaksi.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-neutral-600">
          <tr>
            <th className="px-4 py-3 text-left">Nama</th>
            <th className="px-4 py-3 text-left">Jenis</th>
            <th className="px-4 py-3 text-left">Jml</th>
            <th className="px-4 py-3 text-left">Total</th>
            <th className="px-4 py-3 text-left">Kode</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Bukti/Jual</th>
            <th className="px-4 py-3 text-left">QR Scan</th>
            <th className="px-4 py-3 text-left">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {transaksis.map((tr) => {
            const scanned = tr.qrTikets.filter((q) => q.statusScan).length;
            return (
              <tr key={tr.id} className="bg-white">
                <td className="px-4 py-3">
                  <div className="font-medium">{tr.nama}</div>
                  <div className="text-gray-400 text-xs">{tr.email}</div>
                </td>
                <td className="px-4 py-3">{tr.tiket.jenis}</td>
                <td className="px-4 py-3">{tr.jumlah}</td>
                <td className="px-4 py-3">
                  {formatRupiah(tr.tiket.harga * tr.jumlah)}
                  {tr.kodeUnik && (
                    <div className="text-xs text-gray-400">+{tr.kodeUnik}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {tr.kodeUnik ? (
                    <span className="font-mono font-bold text-primary-600 tracking-widest">{tr.kodeUnik}</span>
                  ) : (
                    <span className="text-gray-300 text-xs">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge[tr.status] ?? ""}`}
                  >
                    {tr.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {tr.jenisJual === "OFFLINE" ? (
                    <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      TUNAI
                    </span>
                  ) : tr.bukti ? (
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
                <td className="px-4 py-3 text-xs">
                  {tr.qrTikets.length
                    ? `${scanned}/${tr.qrTikets.length} scan`
                    : "-"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1.5">
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
                    {tr.status === "VERIFIED" && tr.noHp && (
                      <a
                        href={buildWAMessage(tr)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-xs hover:bg-green-200 transition-colors text-center"
                      >
                        Kirim WA
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
