export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { H1 } from "@/app/components/global/Text";
import KuitansiManualClient from "./components/KuitansiManualClient";

export default async function KuitansiPage() {
  const rows = await prisma.kuitansiManual.findMany({ orderBy: { createdAt: "desc" } });
  const kuitansi = rows.map((k) => ({
    id: k.id,
    nomor: k.nomor,
    tanggal: k.tanggal.toISOString(),
    diterimaDari: k.diterimaDari,
    untukPembayaran: k.untukPembayaran,
    jumlah: k.jumlah,
    metode: k.metode,
    dicatatKas: !!k.kasId,
    olehNama: k.olehNama,
    batal: k.batalAt ? { alasan: k.batalAlasan, oleh: k.batalOleh } : null,
  }));

  return (
    <div className="py-6 flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <H1>Kuitansi</H1>
        <p className="text-sm text-gray-500">
          Buat kuitansi untuk pemasukan di luar alur otomatis (sponsor, donasi, pembayaran tunai, dst). Kuitansi
          pendaftaran, tiket, dan foto tetap terbit otomatis dari menunya masing-masing.
        </p>
      </div>
      <KuitansiManualClient kuitansi={kuitansi} />
    </div>
  );
}
