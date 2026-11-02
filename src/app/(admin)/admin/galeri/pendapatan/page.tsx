export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/next-auth";
import { H1 } from "@/app/components/global/Text";
import { saldoFotografer } from "@/lib/bagiHasilFoto";
import PendapatanClient from "./PendapatanClient";

// Pendapatan bagi hasil foto milik fotografer yang login + pengajuan penarikan.
export default async function PendapatanFotograferPage() {
  const session = await getServerSession();
  const user = session?.user;
  if (user?.role !== "FOTOGRAFER") redirect("/admin/galeri");

  const [saldo, riwayat] = await Promise.all([
    saldoFotografer(user.id),
    prisma.penarikanFotografer.findMany({ where: { fotograferId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const terakhir = riwayat[0];

  return (
    <div className="py-6 flex flex-col gap-8">
      <H1>Pendapatan Saya</H1>
      <PendapatanClient
        saldo={saldo}
        rekeningTerakhir={
          terakhir ? { bankNama: terakhir.bankNama, bankNoRek: terakhir.bankNoRek, bankAtasNama: terakhir.bankAtasNama } : null
        }
        riwayat={riwayat.map((p) => ({
          id: p.id,
          jumlah: p.jumlah,
          biayaAdmin: p.biayaAdmin,
          rekening: `${p.bankNama} ${p.bankNoRek} a.n. ${p.bankAtasNama}`,
          status: p.status,
          catatanAdmin: p.catatanAdmin,
          buktiTransfer: p.buktiTransfer,
          createdAt: p.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
