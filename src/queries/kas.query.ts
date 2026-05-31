import prisma from "@/lib/prisma";

export async function getLaporanKas() {
  const [transaksiTikets, transaksiFotos, kasTransaksis, timsConfirmed] =
    await Promise.all([
      prisma.transaksiTiket.findMany({
        include: { tiket: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.transaksiFoto.findMany({
        include: { user: { select: { nama: true, email: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.kasTransaksi.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.tim.count({ where: { confirmed: true } }),
    ]);

  // Per jenis tiket (VERIFIED)
  const perJenisTiket: Record<
    string,
    { jenis: string; harga: number; terjual: number; pendapatan: number }
  > = {};
  let totalTiketVerified = 0;
  for (const tr of transaksiTikets) {
    if (tr.status !== "VERIFIED") continue;
    totalTiketVerified += tr.tiket.harga * tr.jumlah;
    if (!perJenisTiket[tr.tiketId]) {
      perJenisTiket[tr.tiketId] = {
        jenis: tr.tiket.jenis,
        harga: tr.tiket.harga,
        terjual: 0,
        pendapatan: 0,
      };
    }
    perJenisTiket[tr.tiketId].terjual += tr.jumlah;
    perJenisTiket[tr.tiketId].pendapatan += tr.tiket.harga * tr.jumlah;
  }

  const totalFotoVerified = transaksiFotos
    .filter((f) => f.status === "VERIFIED")
    .reduce((s, f) => s + f.harga, 0);

  const verifiedTikets = transaksiTikets.filter((t) => t.status === "VERIFIED");
  const totalOffline = verifiedTikets
    .filter((t) => t.jenisJual === "OFFLINE")
    .reduce((s, t) => s + t.tiket.harga * t.jumlah, 0);
  const totalOnline = verifiedTikets
    .filter((t) => t.jenisJual !== "OFFLINE")
    .reduce((s, t) => s + t.tiket.harga * t.jumlah, 0);

  const totalPemasukan = kasTransaksis
    .filter((k) => k.tipe === "PEMASUKAN")
    .reduce((s, k) => s + k.jumlah, 0);
  const totalPengeluaran = kasTransaksis
    .filter((k) => k.tipe === "PENGELUARAN")
    .reduce((s, k) => s + k.jumlah, 0);
  const totalPemasukanManual = kasTransaksis
    .filter((k) => k.tipe === "PEMASUKAN" && k.sumber === "MANUAL")
    .reduce((s, k) => s + k.jumlah, 0);

  return {
    totalTiketVerified,
    totalFotoVerified,
    totalPendapatan: totalPemasukan,
    totalPengeluaran,
    saldo: totalPemasukan - totalPengeluaran,
    totalOffline,
    totalOnline,
    totalPemasukanManual,
    timsConfirmed,
    perJenisTiket: Object.values(perJenisTiket),
    transaksiTikets,
    transaksiFotos,
    kasTransaksis,
  };
}
