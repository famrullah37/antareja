export const dynamic = "force-dynamic";
import { findTikets, findTransaksiTikets, findKonfigTiket } from "@/queries/tiket.query";
import { H1 } from "@/app/components/global/Text";
import TiketMasterTable from "./components/TiketMasterTable";
import TransaksiTiketTable from "./components/TransaksiTiketTable";
import TiketForm from "./components/TiketForm";
import KonfigPembayaranForm from "./components/KonfigPembayaranForm";
import StatusTiketWajibTim, { type BarisStatusTiketTim } from "./components/StatusTiketWajibTim";
import prisma from "@/lib/prisma";
import { statusGabungan, statusPerJenis } from "@/lib/tiketWajib";

// Rekap per tim: berapa tiket wajib (khususTim) yang sudah lunas / masih
// menunggu verifikasi. Transaksi terhubung ke tim lewat akun (userId).
async function rekapTiketWajibTim(tiketWajibIds: string[]): Promise<BarisStatusTiketTim[]> {
  const [tims, transaksi] = await Promise.all([
    prisma.tim.findMany({
      select: { id: true, nama_tim: true, asal_sekolah: true, jenjang: true, confirmed: true, userId: true },
      orderBy: { nama_tim: "asc" },
    }),
    prisma.transaksiTiket.findMany({
      where: { tiket: { khususTim: true }, status: { in: ["PENDING", "VERIFIED"] }, userId: { not: null } },
      select: { userId: true, tiketId: true, status: true, jumlah: true },
    }),
  ]);
  const perUser = new Map<string, typeof transaksi>();
  for (const t of transaksi) perUser.set(t.userId!, [...(perUser.get(t.userId!) ?? []), t]);
  return tims.map((tim) => {
    // Status per jenis tiket wajib — "Sudah beli" hanya kalau semua jenis lunas.
    const perJenis = statusPerJenis(tiketWajibIds, perUser.get(tim.userId) ?? []);
    return {
      timId: tim.id,
      namaTim: tim.nama_tim,
      asalSekolah: tim.asal_sekolah,
      jenjang: tim.jenjang,
      confirmed: tim.confirmed,
      status: statusGabungan(perJenis),
      lunas: perJenis.reduce((n, j) => n + j.lunas, 0),
      menunggu: perJenis.reduce((n, j) => n + j.menunggu, 0),
    };
  });
}

export default async function AdminTiketPage() {
  const [tikets, transaksis, konfig] = await Promise.all([
    findTikets(),
    findTransaksiTikets(),
    findKonfigTiket(),
  ]);
  const tiketWajibIds = tikets.filter((t) => t.khususTim).map((t) => t.id);
  const adaTiketWajib = tiketWajibIds.length > 0;
  const rekapTim = adaTiketWajib ? await rekapTiketWajibTim(tiketWajibIds) : [];

  return (
    <div className="flex flex-col gap-8">
      <H1 className="mb-0">Manajemen Tiket</H1>

      <div className="grid lg:grid-cols-2 gap-6">
        <TiketForm />
        <KonfigPembayaranForm konfig={konfig} />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Master Tiket</h2>
        <TiketMasterTable tikets={tikets} />
      </div>

      {adaTiketWajib && (
        <div>
          <h2 className="text-xl font-semibold mb-1">Status Tiket Wajib per Tim</h2>
          <p className="text-sm text-neutral-500 mb-3">
            Dihitung dari pembelian online akun tim untuk tiket bertanda &quot;Wajib tim&quot;. Pesanan yang
            ditolak tidak dihitung.
          </p>
          <StatusTiketWajibTim baris={rekapTim} />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Transaksi Tiket</h2>
          <a
            href="/admin/tiket/scanner"
            className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            Buka Scanner QR
          </a>
        </div>
        <TransaksiTiketTable transaksis={transaksis as any} />
      </div>
    </div>
  );
}
