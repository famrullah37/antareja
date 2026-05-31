export const dynamic = "force-dynamic";
import { findTikets, findTransaksiTikets, findKonfigTiket } from "@/queries/tiket.query";
import { H1 } from "@/app/components/global/Text";
import TiketMasterTable from "./components/TiketMasterTable";
import TransaksiTiketTable from "./components/TransaksiTiketTable";
import TiketForm from "./components/TiketForm";
import KonfigPembayaranForm from "./components/KonfigPembayaranForm";

export default async function AdminTiketPage() {
  const [tikets, transaksis, konfig] = await Promise.all([
    findTikets(),
    findTransaksiTikets(),
    findKonfigTiket(),
  ]);

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
