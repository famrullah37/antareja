export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import type { ItemPesanan } from "@/lib/merchandise";
import { kedaluwarsakanPesananReady, tokenCocok } from "@/lib/merchReady";
import { findKonfigTiket } from "@/queries/tiket.query";
import { formatRupiah, formatTanggalWib } from "../../format";
import BayarReadyForm from "./BayarReadyForm";

// Halaman pribadi pembeli (link rahasia dari email) — jangan diindeks.
export const metadata: Metadata = { title: "Pesanan Merchandise", robots: { index: false, follow: false } };

const STATUS: Record<string, { label: string; ket: string; cls: string }> = {
  MENUNGGU_ONGKIR: {
    label: "Menunggu ongkir",
    ket: "Panitia sedang menghitung ongkos kirim. Total pembayaran akan dikirim ke email Anda.",
    cls: "bg-orange-50 border-orange-200 text-orange-800",
  },
  MENUNGGU_BAYAR: {
    label: "Menunggu pembayaran",
    ket: "Silakan bayar dengan nominal tepat lalu unggah bukti di bawah.",
    cls: "bg-amber-50 border-amber-200 text-amber-800",
  },
  PENDING: {
    label: "Pembayaran sedang dicek",
    ket: "Bukti sudah kami terima. Panitia akan memverifikasi, konfirmasinya dikirim lewat email.",
    cls: "bg-yellow-50 border-yellow-200 text-yellow-800",
  },
  VERIFIED: {
    label: "Lunas",
    ket: "Pembayaran terverifikasi. Pesanan sedang disiapkan.",
    cls: "bg-green-50 border-green-200 text-green-800",
  },
  DIKIRIM: { label: "Dikirim", ket: "Pesanan sudah dikirim.", cls: "bg-indigo-50 border-indigo-200 text-indigo-800" },
  DIAMBIL: { label: "Sudah diambil", ket: "Terima kasih!", cls: "bg-blue-50 border-blue-200 text-blue-800" },
  REJECTED: {
    label: "Pembayaran ditolak",
    ket: "Bukti pembayaran tidak valid. Hubungi panitia untuk informasi lebih lanjut.",
    cls: "bg-red-50 border-red-200 text-red-800",
  },
  BATAL: { label: "Dibatalkan", ket: "Pesanan ini dibatalkan.", cls: "bg-neutral-100 border-neutral-200 text-neutral-700" },
};

export default async function PesananMerchPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { t?: string };
}) {
  await kedaluwarsakanPesananReady();
  const p = await prisma.pesananMerch.findUnique({ where: { id: params.id } });
  if (!p || !tokenCocok(p.aksesToken, searchParams.t)) notFound();
  const konfig = p.status === "MENUNGGU_BAYAR" ? await findKonfigTiket() : null;

  const items = p.items as ItemPesanan[];
  const st = STATUS[p.status] ?? { label: p.status, ket: "", cls: "bg-neutral-50 border-neutral-200" };

  return (
    <section className="max-w-2xl mx-auto py-12 px-4 flex flex-col gap-6">
      <div>
        <Link href="/merchandise" className="text-sm text-primary-600 hover:underline">
          ← Merchandise
        </Link>
        <h1 className="text-2xl font-bold mt-2">Pesanan Merchandise</h1>
        <p className="text-sm text-gray-500">
          {p.nama} · dipesan {formatTanggalWib(p.createdAt)} WIB
        </p>
      </div>

      <div className={`rounded-2xl border p-4 text-sm ${st.cls}`}>
        <p className="font-bold text-base">{st.label}</p>
        <p>{st.ket}</p>
        {p.status === "MENUNGGU_BAYAR" && p.batasBayar && (
          <p className="mt-1">
            Batas bayar: <b>{formatTanggalWib(p.batasBayar)} WIB</b>. Lewat dari itu pesanan otomatis batal.
          </p>
        )}
        {p.status === "DIKIRIM" && p.resi && (
          <p className="mt-1">
            Kurir <b>{p.kurir}</b> · No. resi <b className="font-mono">{p.resi}</b>
          </p>
        )}
        {(p.status === "BATAL" || p.status === "REJECTED") && p.catatanAdmin && <p className="mt-1">Catatan: {p.catatanAdmin}</p>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-2 text-sm">
        {items.map((i, idx) => (
          <div key={idx} className="flex justify-between gap-3">
            <span>
              {i.nama}
              {i.ukuran && <span className="text-gray-500"> ({i.ukuran})</span>} × {i.jumlah}
            </span>
            <span>{formatRupiah(i.harga * i.jumlah)}</span>
          </div>
        ))}
        <div className="border-t border-gray-100 pt-2 flex justify-between">
          <span>Ongkos kirim</span>
          <span>
            {p.pengiriman === "AMBIL" ? "— (ambil sendiri)" : p.ongkir == null ? "menunggu konfirmasi" : formatRupiah(p.ongkir)}
          </span>
        </div>
        {p.kodeUnik && (
          <div className="flex justify-between text-gray-500">
            <span>Kode unik</span>
            <span className="font-mono">+{parseInt(p.kodeUnik)}</span>
          </div>
        )}
        <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-base">
          <span>Total bayar</span>
          <span className="text-primary-600">{p.status === "MENUNGGU_ONGKIR" ? "—" : formatRupiah(p.totalBayar)}</span>
        </div>
        {p.alamat && <p className="text-xs text-gray-500 mt-2 whitespace-pre-line">Dikirim ke: {p.alamat}</p>}
      </div>

      {p.status === "MENUNGGU_BAYAR" && (
        <BayarReadyForm
          id={p.id}
          token={searchParams.t!}
          total={p.totalBayar}
          kodeUnik={p.kodeUnik}
          bank={{ nama: konfig?.bankNama ?? null, noRek: konfig?.bankNoRek ?? null, atasNama: konfig?.bankAtasNama ?? null }}
          qrisUrl={konfig?.qrisUrl ?? null}
        />
      )}
    </section>
  );
}
