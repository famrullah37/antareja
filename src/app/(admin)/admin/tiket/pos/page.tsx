export const dynamic = "force-dynamic";
import { findTikets, findKonfigTiket, findTransaksiTikets } from "@/queries/tiket.query";
import { H1 } from "@/app/components/global/Text";
import JualOfflineForm from "../components/JualOfflineForm";
import TiketOnlineDiambil from "../components/TiketOnlineDiambil";

export default async function POSPage() {
  const [tikets, konfig, online] = await Promise.all([
    findTikets(),
    findKonfigTiket(),
    findTransaksiTikets({ status: "VERIFIED", jenisJual: "ONLINE" }),
  ]);

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <H1>POS — Jual Langsung</H1>
      <JualOfflineForm tikets={tikets as any} qrisUrl={konfig?.qrisUrl ?? null} />
      <TiketOnlineDiambil
        tiket={online.map((t) => ({
          id: t.id,
          nama: t.nama,
          email: t.email,
          noHp: t.noHp,
          jenis: t.tiket.jenis,
          jumlah: t.jumlah,
          bundleJumlah: t.bundleJumlah,
          bundleIsi: t.bundleIsi,
          kodeUnik: t.kodeUnik,
          diambilAt: t.diambilAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
