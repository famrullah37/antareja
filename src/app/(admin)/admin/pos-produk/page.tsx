export const dynamic = "force-dynamic";
import Link from "next/link";
import { H1 } from "@/app/components/global/Text";
import { findProdukPOS, findTransaksiPOS } from "@/queries/posProduk.query";
import { hitungLaba, nomorStrukPOS, type ItemPOS } from "@/lib/posProduk";
import { awalHariWib } from "./waktu";
import ProdukPOSAdmin from "./components/ProdukPOSAdmin";
import RiwayatTransaksiPOS from "./components/RiwayatTransaksiPOS";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

function Kartu({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-orange-800">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs mt-1 opacity-80">{label}</div>
      {sub && <div className="text-xs mt-0.5 opacity-70">{sub}</div>}
    </div>
  );
}

export default async function AdminPosProdukPage() {
  const [produk, transaksi] = await Promise.all([findProdukPOS(), findTransaksiPOS()]);

  const selesai = transaksi.filter((t) => t.status === "SELESAI");
  const sum = (list: typeof selesai) => list.reduce((s, t) => s + t.total, 0);
  const tunai = sum(selesai.filter((t) => t.metodePembayaran === "CASH"));
  const qris = sum(selesai.filter((t) => t.metodePembayaran === "QRIS"));
  const hariIni = selesai.filter((t) => t.createdAt >= awalHariWib());

  // Rekap terjual per produk & varian (transaksi yang tidak dibatalkan).
  // Modal/laba dari snapshot harga beli saat transaksi, bukan harga beli sekarang.
  type Rekap = { nama: string; varian: string; jumlah: number; nominal: number; modal: number; laba: number; tanpaModal: boolean };
  const rekap = new Map<string, Rekap>();
  const semuaItem: ItemPOS[] = [];
  for (const t of selesai) {
    for (const i of t.items as ItemPOS[]) {
      semuaItem.push(i);
      const key = `${i.nama}|${i.varian}`;
      const r = rekap.get(key) ?? { nama: i.nama, varian: i.varian, jumlah: 0, nominal: 0, modal: 0, laba: 0, tanpaModal: false };
      const h = hitungLaba([i]);
      r.jumlah += i.jumlah;
      r.nominal += i.harga * i.jumlah;
      r.modal += h.modal;
      r.laba += h.laba;
      if (h.nominalTanpaModal > 0) r.tanpaModal = true;
      rekap.set(key, r);
    }
  }
  const totalLaba = hitungLaba(semuaItem);
  const rekapList = Array.from(rekap.values()).sort(
    (a, b) => a.nama.localeCompare(b.nama) || a.varian.localeCompare(b.varian)
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <H1 className="mb-0">POS Produk</H1>
        <Link
          href="/admin/pos-produk/kasir"
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg px-4 py-2 text-sm"
        >
          Buka Kasir →
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Kartu label="Total Penjualan" value={rp(tunai + qris)} sub={`${selesai.length} transaksi`} />
        <Kartu label="Tunai" value={rp(tunai)} />
        <Kartu label="QRIS" value={rp(qris)} />
        <Kartu label="Hari Ini" value={rp(sum(hariIni))} sub={`${hariIni.length} transaksi`} />
        <Kartu label="Total Modal (Harga Beli)" value={rp(totalLaba.modal)} />
        <Kartu
          label="Laba Kotor"
          value={rp(totalLaba.laba)}
          sub={
            totalLaba.nominalTanpaModal > 0
              ? `Belum termasuk penjualan ${rp(totalLaba.nominalTanpaModal)} yang harga belinya kosong`
              : undefined
          }
        />
      </div>

      <ProdukPOSAdmin produk={produk} />

      <div>
        <h2 className="text-xl font-semibold mb-3">Rekap Terjual</h2>
        {rekapList.length === 0 ? (
          <p className="text-gray-500 text-sm">Belum ada penjualan.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-200 max-w-4xl">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="px-4 py-3 text-left">Produk</th>
                  <th className="px-4 py-3 text-left">Ukuran</th>
                  <th className="px-4 py-3 text-right">Terjual</th>
                  <th className="px-4 py-3 text-right">Penjualan</th>
                  <th className="px-4 py-3 text-right">Modal</th>
                  <th className="px-4 py-3 text-right">Laba</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {rekapList.map((r) => (
                  <tr key={`${r.nama}|${r.varian}`}>
                    <td className="px-4 py-2">{r.nama}</td>
                    <td className="px-4 py-2">{r.varian || "-"}</td>
                    <td className="px-4 py-2 text-right font-semibold">{r.jumlah}</td>
                    <td className="px-4 py-2 text-right">{rp(r.nominal)}</td>
                    <td className="px-4 py-2 text-right">{rp(r.modal)}</td>
                    <td className={`px-4 py-2 text-right font-semibold ${r.laba < 0 ? "text-red-600" : "text-green-700"}`}>
                      {rp(r.laba)}
                      {r.tanpaModal && (
                        <span className="block text-xs font-normal text-amber-600">sebagian tanpa harga beli</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-neutral-50 font-semibold">
                <tr>
                  <td className="px-4 py-2" colSpan={3}>Total</td>
                  <td className="px-4 py-2 text-right">{rp(rekapList.reduce((s, r) => s + r.nominal, 0))}</td>
                  <td className="px-4 py-2 text-right">{rp(totalLaba.modal)}</td>
                  <td className={`px-4 py-2 text-right ${totalLaba.laba < 0 ? "text-red-600" : "text-green-700"}`}>{rp(totalLaba.laba)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Riwayat Transaksi</h2>
        <RiwayatTransaksiPOS
          transaksi={transaksi.map((t) => ({
            id: t.id,
            nomor: nomorStrukPOS(t.nomor),
            items: t.items as ItemPOS[],
            total: t.total,
            metodePembayaran: t.metodePembayaran,
            uangDiterima: t.uangDiterima,
            namaPembeli: t.namaPembeli,
            catatan: t.catatan,
            kasirNama: t.kasirNama,
            status: t.status,
            batalAlasan: t.batalAlasan,
            batalOleh: t.batalOleh,
            createdAt: t.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
