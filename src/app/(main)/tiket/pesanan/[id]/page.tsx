export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { cekTandaPesanan } from "@/lib/linkPesanan";
import { namaTiket, totalBayarTiket } from "@/lib/tiket";
import type { Metadata } from "next";
import Link from "next/link";
import UploadBuktiForm from "./UploadBuktiForm";

export const metadata: Metadata = { title: "Pesanan Tiket", robots: { index: false, follow: false } };

const STATUS: Record<string, { label: string; cls: string; ket: string }> = {
  PENDING: {
    label: "Menunggu Verifikasi",
    cls: "bg-yellow-100 text-yellow-800",
    ket: "Panitia sedang mencocokkan pembayaran Anda. QR code tiket dikirim ke email setelah diverifikasi.",
  },
  VERIFIED: {
    label: "Terverifikasi",
    cls: "bg-green-100 text-green-800",
    ket: "Pembayaran sudah diverifikasi. QR code tiket sudah dikirim ke email Anda — tunjukkan saat masuk lokasi.",
  },
  REJECTED: {
    label: "Ditolak",
    cls: "bg-red-100 text-red-800",
    ket: "Pembayaran tidak dapat diverifikasi. Hubungi panitia bila Anda sudah membayar.",
  },
};

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export default async function PesananTiketPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { t?: string };
}) {
  const sah = cekTandaPesanan(params.id, searchParams.t);
  const tr = sah
    ? await prisma.transaksiTiket.findUnique({ where: { id: params.id }, include: { tiket: true } })
    : null;

  if (!tr || tr.jenisJual !== "ONLINE")
    return (
      <section className="max-w-xl mx-auto py-16 px-4 text-center flex flex-col gap-3">
        <h1 className="text-2xl font-bold">Pesanan tidak ditemukan</h1>
        <p className="text-gray-500">Pastikan Anda membuka link lengkap dari email &quot;Pesanan Tiket Diterima&quot;.</p>
        <Link href="/tiket" className="text-primary-600 hover:underline">
          Kembali ke halaman tiket
        </Link>
      </section>
    );

  const status = STATUS[tr.status] ?? STATUS.PENDING;
  return (
    <section className="max-w-xl mx-auto py-12 px-4 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Pesanan Tiket</h1>
        <p className="text-sm text-gray-500">a.n. {tr.nama} · {tr.email}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-3 text-sm">
        <span className={`w-fit text-xs font-semibold px-3 py-1 rounded-full ${status.cls}`}>{status.label}</span>
        <p className="text-gray-600">{status.ket}</p>
        <div className="border-t border-gray-100 pt-3 flex flex-col gap-1">
          <div className="flex justify-between">
            <span>{namaTiket(tr.tiket.jenis)}</span>
            <span>× {tr.jumlah}</span>
          </div>
          {tr.bundleJumlah > 0 && (
            <div className="flex justify-between">
              <span>{tr.bundleIsi ?? "Bundling"}</span>
              <span>× {tr.bundleJumlah}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Metode</span>
            <span>{tr.metodePembayaran === "QRIS" ? "QRIS" : "Transfer Bank"}</span>
          </div>
          {tr.kodeUnik && (
            <div className="flex justify-between">
              <span>Kode unik</span>
              <span className="font-mono font-bold">{tr.kodeUnik}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base">
            <span>Total dibayar</span>
            <span>{rupiah(totalBayarTiket(tr))}</span>
          </div>
        </div>
      </div>

      {tr.status === "PENDING" && (
        <UploadBuktiForm id={tr.id} t={searchParams.t!} buktiUrl={tr.bukti} />
      )}
    </section>
  );
}
