export const dynamic = "force-dynamic";
import { H1 } from "@/app/components/global/Text";
import { findKonfigMerch, findMerchandises, findPesananMerchs } from "@/queries/merchandise.query";
import { hitungModalMerch, type ItemPesanan } from "@/lib/merchandise";
import KonfigMerchForm from "./components/KonfigMerchForm";
import ProdukMerch from "./components/ProdukMerch";
import PesananMerchTable from "./components/PesananMerchTable";
import IsiHargaBeliLamaButton from "@/app/components/global/IsiHargaBeliLamaButton";
import { isiHargaBeliPesananLamaMerch } from "@/actions/Merchandise";
import { kedaluwarsakanPesananReady } from "@/lib/merchReady";

// Lunas = sudah diverifikasi (termasuk yang sudah diambil/dikirim).
const LUNAS = ["VERIFIED", "DIAMBIL", "DIKIRIM"];

export default async function AdminMerchandisePage() {
  // Pesanan ready stock yang lewat batas bayar → batal & stok kembali.
  await kedaluwarsakanPesananReady();
  const [produk, konfig, pesanan] = await Promise.all([
    findMerchandises(),
    findKonfigMerch(),
    findPesananMerchs(),
  ]);

  // Rekap produksi: total per produk & ukuran dari pesanan yang sudah dibayar
  // (VERIFIED/DIAMBIL) — angka inilah yang dipesan ke vendor.
  // Bayar vendor = harga beli × jumlah (snapshot saat pesan); pendapatan
  // panitia = uang masuk (termasuk kode unik) − bayar vendor.
  const rekap = new Map<
    string,
    { nama: string; ukuran: string | null; jumlah: number; bayarVendor: number; tanpaHargaBeli: boolean }
  >();
  let bayarVendor = 0;
  let barangTanpaHargaBeli = 0;
  for (const p of pesanan) {
    if (!LUNAS.includes(p.status)) continue;
    for (const i of p.items as ItemPesanan[]) {
      const key = `${i.nama}|${i.ukuran ?? ""}`;
      const r = rekap.get(key) ?? { nama: i.nama, ukuran: i.ukuran, jumlah: 0, bayarVendor: 0, tanpaHargaBeli: false };
      const h = hitungModalMerch([i]);
      r.jumlah += i.jumlah;
      r.bayarVendor += h.modal;
      bayarVendor += h.modal;
      if (h.barangTanpaHargaBeli > 0) {
        r.tanpaHargaBeli = true;
        barangTanpaHargaBeli += h.barangTanpaHargaBeli;
      }
      rekap.set(key, r);
    }
  }
  const rekapList = Array.from(rekap.values()).sort(
    (a, b) => a.nama.localeCompare(b.nama) || (a.ukuran ?? "").localeCompare(b.ukuran ?? "")
  );
  const lunas = pesanan.filter((p) => LUNAS.includes(p.status));
  const totalMasuk = lunas.reduce((s, p) => s + p.totalBayar, 0);
  // Ongkir ikut ditransfer pembeli tapi diteruskan ke kurir — bukan pendapatan.
  const totalOngkir = lunas.reduce((s, p) => s + (p.ongkir ?? 0), 0);
  const perluTindakan = pesanan.filter((p) => p.status === "MENUNGGU_ONGKIR" || p.status === "PENDING").length;
  const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <H1 className="mb-0">Merchandise</H1>
        {perluTindakan > 0 && (
          <p className="text-sm text-orange-700 mt-1">{perluTindakan} pesanan perlu tindakan (isi ongkir / cek bukti bayar).</p>
        )}
      </div>

      <KonfigMerchForm konfig={konfig} />

      <ProdukMerch produk={produk} />

      <div>
        <h2 className="text-xl font-semibold mb-1">Rekap Produksi & Keuangan</h2>
        <p className="text-sm text-gray-500 mb-3">
          Dari pesanan terverifikasi. Bayar vendor = harga beli × jumlah.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 max-w-4xl">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-800">
            <div className="text-xl font-bold">{rp(totalMasuk)}</div>
            <div className="text-xs mt-1 opacity-80">Uang masuk (pesanan lunas)</div>
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-orange-800">
            <div className="text-xl font-bold">{rp(bayarVendor)}</div>
            <div className="text-xs mt-1 opacity-80">Harus dibayar ke vendor</div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-neutral-700">
            <div className="text-xl font-bold">{rp(totalOngkir)}</div>
            <div className="text-xs mt-1 opacity-80">Ongkir (diteruskan ke kurir)</div>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
            <div className="text-xl font-bold">{rp(totalMasuk - bayarVendor - totalOngkir)}</div>
            <div className="text-xs mt-1 opacity-80">Pendapatan panitia</div>
          </div>
        </div>
        {barangTanpaHargaBeli > 0 && (
          <div className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 mb-4 max-w-3xl">
            {barangTanpaHargaBeli} barang lunas belum punya harga beli, jadi biaya vendornya belum terhitung dan
            pendapatan panitia terlihat lebih besar dari seharusnya. Pesanan yang masuk sebelum harga beli diisi
            tetap memakai harga lama (kosong).
            <div>
              <IsiHargaBeliLamaButton aksi={isiHargaBeliPesananLamaMerch} />
            </div>
          </div>
        )}
        {rekapList.length === 0 ? (
          <p className="text-gray-400 text-sm">Belum ada pesanan terverifikasi.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-200 max-w-3xl">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="px-4 py-3 text-left">Produk</th>
                  <th className="px-4 py-3 text-left">Ukuran</th>
                  <th className="px-4 py-3 text-right">Jumlah</th>
                  <th className="px-4 py-3 text-right">Bayar Vendor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {rekapList.map((r) => (
                  <tr key={`${r.nama}|${r.ukuran}`}>
                    <td className="px-4 py-2">{r.nama}</td>
                    <td className="px-4 py-2">{r.ukuran ?? "-"}</td>
                    <td className="px-4 py-2 text-right font-semibold">{r.jumlah}</td>
                    <td className="px-4 py-2 text-right">
                      {rp(r.bayarVendor)}
                      {r.tanpaHargaBeli && <span className="block text-xs text-amber-600">ada tanpa harga beli</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-neutral-50 font-semibold">
                <tr>
                  <td className="px-4 py-2" colSpan={2}>Total</td>
                  <td className="px-4 py-2 text-right">{rekapList.reduce((s, r) => s + r.jumlah, 0)}</td>
                  <td className="px-4 py-2 text-right">{rp(bayarVendor)}</td>
                </tr>
              </tfoot>
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
