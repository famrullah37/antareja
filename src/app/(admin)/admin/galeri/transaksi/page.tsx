export const dynamic = "force-dynamic";
import Link from "next/link";
import { findTransaksiFotos } from "@/queries/galeri.query";
import { hitungBagiHasilFoto } from "@/lib/bagiHasilFoto";
import { H1 } from "@/app/components/global/Text";
import TransaksiFotoTable from "../components/TransaksiFotoTable";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

function Kartu({ label, value, sub, warna }: { label: string; value: string; sub?: string; warna: string }) {
  return (
    <div className={`rounded-xl border p-4 ${warna}`}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs mt-1 opacity-80">{label}</div>
      {sub && <div className="text-xs mt-0.5 opacity-70">{sub}</div>}
    </div>
  );
}

// Verifikasi pembelian foto untuk Admin & Bendahara — terpisah dari
// /admin/galeri supaya bendahara tidak ikut mendapat kelola album/upload foto.
export default async function TransaksiFotoPage() {
  const [transaksis, bagiHasil] = await Promise.all([findTransaksiFotos(), hitungBagiHasilFoto()]);
  const menunggu = transaksis.filter((t) => t.status === "PENDING").length;
  // Pendapatan bersih panitia = uang masuk (termasuk kode unik) − bagian fotografer.
  const bersih = bagiHasil.totalKas - bagiHasil.totalFotografer;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <H1 className="mb-0">Transaksi Pembelian Foto</H1>
        <p className="text-sm text-gray-500">
          {transaksis.length} transaksi · {menunggu} menunggu verifikasi
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-5xl">
        <Kartu
          label="Uang masuk (terverifikasi)"
          value={rp(bagiHasil.totalKas)}
          sub={`${bagiHasil.jumlahTransaksi} transaksi · termasuk kode unik ${rp(bagiHasil.totalKodeUnik)}`}
          warna="bg-blue-50 border-blue-200 text-blue-800"
        />
        <Kartu
          label="Penjualan foto (tanpa kode unik)"
          value={rp(bagiHasil.totalPenjualan)}
          warna="bg-neutral-50 border-neutral-200 text-neutral-800"
        />
        <Kartu
          label={`Bagian fotografer (${bagiHasil.persenFotografer}%)`}
          value={rp(bagiHasil.totalFotografer)}
          sub="Dibayarkan ke fotografer"
          warna="bg-orange-50 border-orange-200 text-orange-800"
        />
        <Kartu
          label="Pendapatan bersih panitia"
          value={rp(bersih)}
          sub="Uang masuk − bagian fotografer"
          warna="bg-green-50 border-green-200 text-green-800"
        />
      </div>
      <p className="text-xs text-gray-500 -mt-3">
        Rincian per fotografer & penarikan ada di{" "}
        <Link href="/admin/galeri/bagi-hasil" className="text-primary-600 hover:underline">
          Bagi Hasil Foto
        </Link>
        .
      </p>

      <TransaksiFotoTable transaksis={transaksis as any} />
    </div>
  );
}
