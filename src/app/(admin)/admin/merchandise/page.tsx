export const dynamic = "force-dynamic";
import { H1 } from "@/app/components/global/Text";
import { findKonfigMerch, findMerchandises, findPesananMerchs } from "@/queries/merchandise.query";
import type { ItemPesanan } from "@/lib/merchandise";
import KonfigMerchForm from "./components/KonfigMerchForm";
import ProdukMerch from "./components/ProdukMerch";
import PesananMerchTable from "./components/PesananMerchTable";

export default async function AdminMerchandisePage() {
  const [produk, konfig, pesanan] = await Promise.all([
    findMerchandises(),
    findKonfigMerch(),
    findPesananMerchs(),
  ]);

  // Rekap produksi: total per produk & ukuran dari pesanan yang sudah dibayar
  // (VERIFIED/DIAMBIL) — angka inilah yang dipesan ke vendor.
  const rekap = new Map<string, { nama: string; ukuran: string | null; jumlah: number }>();
  for (const p of pesanan) {
    if (p.status !== "VERIFIED" && p.status !== "DIAMBIL") continue;
    for (const i of p.items as ItemPesanan[]) {
      const key = `${i.nama}|${i.ukuran ?? ""}`;
      const r = rekap.get(key) ?? { nama: i.nama, ukuran: i.ukuran, jumlah: 0 };
      r.jumlah += i.jumlah;
      rekap.set(key, r);
    }
  }
  const rekapList = Array.from(rekap.values()).sort(
    (a, b) => a.nama.localeCompare(b.nama) || (a.ukuran ?? "").localeCompare(b.ukuran ?? "")
  );
  const totalMasuk = pesanan
    .filter((p) => p.status === "VERIFIED" || p.status === "DIAMBIL")
    .reduce((s, p) => s + p.totalBayar, 0);

  return (
    <div className="flex flex-col gap-8">
      <H1 className="mb-0">Merchandise (Pre-Order)</H1>

      <KonfigMerchForm konfig={konfig} />

      <ProdukMerch produk={produk} />

      <div>
        <h2 className="text-xl font-semibold mb-1">Rekap Produksi</h2>
        <p className="text-sm text-gray-500 mb-3">
          Dari pesanan terverifikasi · Total pemasukan Rp{totalMasuk.toLocaleString("id-ID")}
        </p>
        {rekapList.length === 0 ? (
          <p className="text-gray-400 text-sm">Belum ada pesanan terverifikasi.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-200 max-w-xl">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="px-4 py-3 text-left">Produk</th>
                  <th className="px-4 py-3 text-left">Ukuran</th>
                  <th className="px-4 py-3 text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {rekapList.map((r) => (
                  <tr key={`${r.nama}|${r.ukuran}`}>
                    <td className="px-4 py-2">{r.nama}</td>
                    <td className="px-4 py-2">{r.ukuran ?? "-"}</td>
                    <td className="px-4 py-2 text-right font-semibold">{r.jumlah}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Pesanan</h2>
        <PesananMerchTable pesanan={pesanan as any} />
      </div>
    </div>
  );
}
