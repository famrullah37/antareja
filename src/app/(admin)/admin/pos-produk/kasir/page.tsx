export const dynamic = "force-dynamic";
import { H1 } from "@/app/components/global/Text";
import { findProdukPOS, findTransaksiPOS } from "@/queries/posProduk.query";
import { findKonfigTiket } from "@/queries/tiket.query";
import { awalHariWib } from "../waktu";
import { nomorStrukPOS, tanpaHargaBeli, type ItemPOS } from "@/lib/posProduk";
import KasirPOS from "../components/KasirPOS";

export default async function KasirPOSPage() {
  const [produk, konfig, transaksi] = await Promise.all([
    findProdukPOS({ hanyaAktif: true }),
    findKonfigTiket(), // QRIS sama dengan tiket/merchandise
    findTransaksiPOS({ sejak: awalHariWib() }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <H1 className="mb-0">POS Produk — Kasir</H1>
      <KasirPOS
        produk={produk
          .filter((p) => p.varian.length > 0)
          .map((p) => ({
            id: p.id,
            nama: p.nama,
            harga: p.harga,
            foto: p.foto,
            varian: p.varian.map((v) => ({ id: v.id, nama: v.nama, stok: v.stok })),
          }))}
        qrisUrl={konfig?.qrisUrl ?? null}
        hariIni={transaksi.map((t) => ({
          id: t.id,
          nomor: nomorStrukPOS(t.nomor),
          items: tanpaHargaBeli(t.items as ItemPOS[]), // kasir tidak perlu tahu modal
          total: t.total,
          metodePembayaran: t.metodePembayaran,
          uangDiterima: t.uangDiterima,
          namaPembeli: t.namaPembeli,
          kasirNama: t.kasirNama,
          status: t.status,
          createdAt: t.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
