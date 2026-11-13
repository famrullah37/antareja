import { totalBayarTiket } from "@/lib/tiket";

export type PenjualanPOSTiket = {
  id: string;
  nama: string;
  jumlah: number;
  bundleJumlah: number;
  bundleHarga: number;
  kodeUnik: string | null;
  metodePembayaran: string;
  createdAt: Date;
  tiket: { jenis: string; harga: number };
};

const rp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const jam = (d: Date) =>
  d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

// Rekap penjualan loket (POS Tiket) sejak 00:00 WIB — untuk closing kasir:
// cocokkan uang tunai di laci dan mutasi QRIS dengan angka di sini.
export default function RekapPOSTiketHariIni({ transaksi }: { transaksi: PenjualanPOSTiket[] }) {
  let totalTunai = 0;
  let totalQris = 0;
  let totalLembar = 0;
  const perJenis = new Map<string, { lembar: number; tunai: number; qris: number }>();
  for (const t of transaksi) {
    const total = totalBayarTiket(t);
    const qris = t.metodePembayaran === "QRIS";
    if (qris) totalQris += total;
    else totalTunai += total;
    totalLembar += t.jumlah;
    const j = perJenis.get(t.tiket.jenis) ?? { lembar: 0, tunai: 0, qris: 0 };
    j.lembar += t.jumlah;
    if (qris) j.qris += total;
    else j.tunai += total;
    perJenis.set(t.tiket.jenis, j);
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-5 flex flex-col gap-4">
      <div>
        <h2 className="font-semibold text-lg">Penjualan POS Tiket Hari Ini</h2>
        <p className="text-xs text-gray-500">
          Untuk closing kasir — cocokkan uang tunai di laci dan mutasi QRIS dengan angka di bawah. Semua transaksi ini
          sudah otomatis masuk buku kas.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-green-50 border border-green-200 p-3">
          <div className="text-lg font-bold text-green-800">{rp(totalTunai)}</div>
          <div className="text-xs text-green-700">Tunai</div>
        </div>
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
          <div className="text-lg font-bold text-blue-800">{rp(totalQris)}</div>
          <div className="text-xs text-blue-700">QRIS</div>
        </div>
        <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3">
          <div className="text-lg font-bold">{rp(totalTunai + totalQris)}</div>
          <div className="text-xs text-gray-600">
            Total · {totalLembar} tiket / {transaksi.length} transaksi
          </div>
        </div>
      </div>

      {transaksi.length === 0 ? (
        <p className="text-sm text-gray-500">Belum ada penjualan di loket hari ini.</p>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 border-b border-neutral-100">
              <tr>
                <th className="py-2 text-left">Jenis</th>
                <th className="py-2 text-right">Tiket</th>
                <th className="py-2 text-right">Tunai</th>
                <th className="py-2 text-right">QRIS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {[...perJenis].map(([jenis, j]) => (
                <tr key={jenis}>
                  <td className="py-2">{jenis}</td>
                  <td className="py-2 text-right">{j.lembar}</td>
                  <td className="py-2 text-right">{rp(j.tunai)}</td>
                  <td className="py-2 text-right">{rp(j.qris)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <details className="text-sm">
            <summary className="cursor-pointer text-primary-600">Rincian {transaksi.length} transaksi</summary>
            <table className="w-full mt-2">
              <thead className="text-xs text-gray-500 border-b border-neutral-100">
                <tr>
                  <th className="py-2 text-left">Jam</th>
                  <th className="py-2 text-left">Pembeli</th>
                  <th className="py-2 text-left">Tiket</th>
                  <th className="py-2 text-left">Bayar</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {transaksi.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 whitespace-nowrap">{jam(t.createdAt)}</td>
                    <td className="py-2">{t.nama || "-"}</td>
                    <td className="py-2">
                      {t.tiket.jenis} ×{t.jumlah}
                      {t.bundleJumlah > 0 && <span className="text-xs text-amber-700"> +{t.bundleJumlah} bundling</span>}
                    </td>
                    <td className="py-2">{t.metodePembayaran === "QRIS" ? "QRIS" : "Tunai"}</td>
                    <td className="py-2 text-right font-semibold whitespace-nowrap">{rp(totalBayarTiket(t))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </div>
  );
}
