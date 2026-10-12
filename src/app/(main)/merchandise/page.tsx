import { getServerSession } from "@/lib/next-auth";
import { findKonfigTiket } from "@/queries/tiket.query";
import { findKonfigMerch, findMerchandises } from "@/queries/merchandise.query";
import { poTerbuka } from "@/lib/merchandise";
import { formatTanggalWib } from "./format";
import PesanMerchForm from "./PesanMerchForm";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Merchandise",
  description: "Pre-order merchandise resmi LPKBB Antareja 2026.",
};

export default async function MerchandisePage() {
  const [produk, konfigMerch, konfigBayar, session] = await Promise.all([
    findMerchandises({ aktif: true }),
    findKonfigMerch(),
    findKonfigTiket(),
    getServerSession(),
  ]);
  const terbuka = poTerbuka(konfigMerch);

  return (
    <section className="max-w-5xl mx-auto py-12 px-4">
      <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary-500 bg-primary-50 rounded-full px-3 py-1 mb-3">
        Pre-Order
      </span>
      <h1 className="text-3xl font-bold mb-2">Merchandise Antareja 2026</h1>
      <p className="text-gray-500 mb-2">
        Merchandise resmi diproduksi sesuai jumlah pesanan. Pesan & bayar selama periode PO.
      </p>
      {konfigMerch?.tutupPada && (
        <p className="text-sm text-gray-600 mb-2">
          PO ditutup: <b>{formatTanggalWib(konfigMerch.tutupPada)}</b>
        </p>
      )}
      {konfigMerch?.infoPengambilan && (
        <p className="text-sm text-gray-600 mb-8 whitespace-pre-line">{konfigMerch.infoPengambilan}</p>
      )}

      {produk.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-400 mt-6">
          Merchandise belum tersedia. Pantau terus website ini.
        </div>
      ) : (
        <PesanMerchForm
          produk={produk}
          terbuka={terbuka}
          konfig={konfigBayar}
          userId={session?.user?.id}
        />
      )}
    </section>
  );
}
