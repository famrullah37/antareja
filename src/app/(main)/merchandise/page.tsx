import { findKonfigTiket } from "@/queries/tiket.query";
import { findKonfigMerch, findMerchandises } from "@/queries/merchandise.query";
import { poTerbuka } from "@/lib/merchandise";
import { formatTanggalWib } from "./format";
import PesanMerchForm from "./PesanMerchForm";
import InfoHalaman from "../components/InfoHalaman";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Merchandise Resmi LPKBB Antareja 2026 | SMK Telkom Malang" },
  description:
    "Pre-order merchandise resmi LPKBB Antareja 2026, lomba paskibra SMK Telkom Malang. Pesan dan bayar online selama periode PO, ambil di lokasi acara.",
};

export default async function MerchandisePage() {
  const [produk, konfigMerch, konfigBayar] = await Promise.all([
    findMerchandises({ aktif: true }),
    findKonfigMerch(),
    findKonfigTiket(),
  ]);
  const terbuka = poTerbuka(konfigMerch);

  return (
    <>
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
        />
      )}
    </section>
    <InfoHalaman path="/merchandise" label="Merchandise" judul="Tentang Merchandise Antareja">
      <p>
        Merchandise resmi LPKBB Antareja 2026 dijual dengan sistem pre-order (PO): barang diproduksi sesuai jumlah
        pesanan yang masuk selama periode PO. Pilih produk dan ukuran, lalu bayar melalui transfer atau QRIS.
      </p>
      <p>
        Pesanan diproses setelah pembayaran diverifikasi panitia, dan bukti pemesanan dikirim ke email. Informasi
        pengambilan barang tercantum di atas dan di email bukti pemesanan.
      </p>
    </InfoHalaman>
    </>
  );
}
