export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/next-auth";
import { H1 } from "@/app/components/global/Text";
import { hitungBagiHasilFoto, ringkasPenarikan } from "@/lib/bagiHasilFoto";
import BagiHasilClient from "./BagiHasilClient";

// Rekap bagi hasil foto premium per fotografer + proses penarikan (Admin & Bendahara).
export default async function BagiHasilFotoPage() {
  const session = await getServerSession();
  const role = session?.user?.role ?? "";
  if (!["ADMIN", "BENDAHARA"].includes(role)) redirect("/admin/galeri");

  const [hasil, penarikanMap, penarikan] = await Promise.all([
    hitungBagiHasilFoto(),
    ringkasPenarikan(),
    prisma.penarikanFotografer.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      include: { fotografer: { select: { nama: true } } },
    }),
  ]);

  const fotografer = hasil.fotografer.map((f) => {
    const p = (f.fotograferId && penarikanMap.get(f.fotograferId)) || { dibayar: 0, diajukan: 0 };
    return { ...f, dibayar: p.dibayar, diajukan: p.diajukan, saldo: f.bagianFotografer - p.dibayar - p.diajukan };
  });

  return (
    <div className="py-6 flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <H1>Bagi Hasil Foto</H1>
        <p className="text-sm text-gray-500">
          Kas mencatat nominal yang dibayar pembeli (harga + kode unik). Bagian fotografer dihitung dari harga jual
          tanpa kode unik; sisanya dan seluruh kode unik masuk panitia.
        </p>
      </div>
      <BagiHasilClient
        bisaAturPersen={role === "ADMIN"}
        ringkas={{
          persenFotografer: hasil.persenFotografer,
          biayaAdminPenarikan: hasil.biayaAdminPenarikan,
          jumlahTransaksi: hasil.jumlahTransaksi,
          totalKas: hasil.totalKas,
          totalKodeUnik: hasil.totalKodeUnik,
          totalPenjualan: hasil.totalPenjualan,
          totalFotografer: hasil.totalFotografer,
        }}
        fotografer={fotografer}
        penarikan={penarikan.map((p) => ({
          id: p.id,
          fotografer: p.fotografer.nama,
          jumlah: p.jumlah,
          biayaAdmin: p.biayaAdmin,
          rekening: `${p.bankNama} ${p.bankNoRek} a.n. ${p.bankAtasNama}`,
          catatan: p.catatan,
          status: p.status,
          catatanAdmin: p.catatanAdmin,
          buktiTransfer: p.buktiTransfer,
          diprosesOleh: p.diprosesOleh,
          createdAt: p.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
