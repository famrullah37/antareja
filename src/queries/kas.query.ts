import prisma from "@/lib/prisma";
import { totalBayarTiket } from "@/lib/tiket";
import { hitungModalMerch, type ItemPesanan } from "@/lib/merchandise";
import { hitungLabaMakanan, type ItemMakanan } from "@/lib/makanan";
import { hitungLaba, type ItemPOS } from "@/lib/posProduk";

export type PendapatanUsaha = {
  nama: string;
  masuk: number; // uang yang benar-benar diterima (lunas / tidak dibatalkan)
  modal: number; // harga beli × jumlah (snapshot saat transaksi)
  bersih: number; // masuk − modal
  tanpaHargaBeli: number; // jumlah barang/porsi yang harga belinya kosong
};

// Pendapatan bersih panitia per unit usaha yang punya harga beli. Modal dari
// snapshot harga beli; barang tanpa harga beli dihitung modal 0 (ditandai).
async function getPendapatanUsaha(): Promise<PendapatanUsaha[]> {
  const lunas = { status: { in: ["VERIFIED", "DIAMBIL"] } };
  const [merch, makanan, pos] = await Promise.all([
    prisma.pesananMerch.findMany({ where: lunas, select: { items: true, totalBayar: true } }),
    prisma.pesananMakanan.findMany({ where: lunas, select: { items: true, totalBayar: true } }),
    prisma.transaksiPOS.findMany({ where: { status: "SELESAI" }, select: { items: true, total: true } }),
  ]);
  const baris = (nama: string, masuk: number, modal: number, tanpaHargaBeli: number) => ({
    nama, masuk, modal, bersih: masuk - modal, tanpaHargaBeli,
  });

  let mMasuk = 0, mModal = 0, mTanpa = 0;
  for (const p of merch) {
    const h = hitungModalMerch(p.items as ItemPesanan[]);
    mMasuk += p.totalBayar; mModal += h.modal; mTanpa += h.barangTanpaHargaBeli;
  }
  let kMasuk = 0, kModal = 0, kTanpa = 0;
  for (const p of makanan) {
    const items = p.items as ItemMakanan[];
    kMasuk += p.totalBayar; kModal += hitungLabaMakanan(items).modal;
    kTanpa += items.filter((i) => i.hargaBeli == null).reduce((s, i) => s + i.jumlah, 0);
  }
  let pMasuk = 0, pModal = 0, pTanpa = 0;
  for (const t of pos) {
    const items = t.items as ItemPOS[];
    pMasuk += t.total; pModal += hitungLaba(items).modal;
    pTanpa += items.filter((i) => i.hargaBeli == null).reduce((s, i) => s + i.jumlah, 0);
  }
  return [
    baris("Merchandise (PO)", mMasuk, mModal, mTanpa),
    baris("Pemesanan Makanan", kMasuk, kModal, kTanpa),
    baris("POS Produk", pMasuk, pModal, pTanpa),
  ];
}

export async function getLaporanKas() {
  const pendapatanUsahaP = getPendapatanUsaha();
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

  // Per jenis tiket (VERIFIED) — nominal HARUS termasuk kode unik untuk
  // tiket online (tiket.harga * jumlah + bundling + kodeUnik), itulah nominal yang
  // benar-benar diterima lewat transfer/QRIS. Tiket offline/tunai tidak
  // pernah punya kodeUnik (jualTiketOffline tidak mencadangkannya), jadi
  // aman: (tr.kodeUnik ? parseInt(tr.kodeUnik) : 0) otomatis 0 untuknya.
  const perJenisTiket: Record<
    string,
    { jenis: string; harga: number; terjual: number; pendapatan: number }
  > = {};
  let totalTiketVerified = 0;
  for (const tr of transaksiTikets) {
    if (tr.status !== "VERIFIED") continue;
    const totalBayar = totalBayarTiket(tr);
    totalTiketVerified += totalBayar;
    if (!perJenisTiket[tr.tiketId]) {
      perJenisTiket[tr.tiketId] = {
        jenis: tr.tiket.jenis,
        harga: tr.tiket.harga,
        terjual: 0,
        pendapatan: 0,
      };
    }
    perJenisTiket[tr.tiketId].terjual += tr.jumlah;
    perJenisTiket[tr.tiketId].pendapatan += totalBayar;
  }

  const totalFotoVerified = transaksiFotos
    .filter((f) => f.status === "VERIFIED")
    .reduce((s, f) => s + f.harga, 0);

  const verifiedTikets = transaksiTikets.filter((t) => t.status === "VERIFIED");
  // "Offline" = uang tunai fisik (POS metode CASH); penjualan POS via QRIS
  // sudah masuk rekening, jadi dihitung ke non-tunai bersama online.
  const isTunai = (t: { jenisJual: string; metodePembayaran: string }) =>
    t.jenisJual === "OFFLINE" && t.metodePembayaran === "CASH";
  const totalOffline = verifiedTikets
    .filter(isTunai)
    .reduce((s, t) => s + totalBayarTiket(t), 0);
  const totalOnline = verifiedTikets
    .filter((t) => !isTunai(t))
    .reduce((s, t) => s + totalBayarTiket(t), 0);

  const totalPemasukan = kasTransaksis
    .filter((k) => k.tipe === "PEMASUKAN")
    .reduce((s, k) => s + k.jumlah, 0);
  const totalPengeluaran = kasTransaksis
    .filter((k) => k.tipe === "PENGELUARAN")
    .reduce((s, k) => s + k.jumlah, 0);
  const totalPemasukanManual = kasTransaksis
    .filter((k) => k.tipe === "PEMASUKAN" && k.sumber === "MANUAL")
    .reduce((s, k) => s + k.jumlah, 0);
  const totalVotingVerified = kasTransaksis
    .filter((k) => k.tipe === "PEMASUKAN" && k.sumber === "VOTING")
    .reduce((s, k) => s + k.jumlah, 0);
  const totalPendaftaranVerified = kasTransaksis
    .filter((k) => k.tipe === "PEMASUKAN" && k.sumber === "PENDAFTARAN")
    .reduce((s, k) => s + k.jumlah, 0);
  const totalMerchVerified = kasTransaksis
    .filter((k) => k.tipe === "PEMASUKAN" && k.sumber === "MERCHANDISE")
    .reduce((s, k) => s + k.jumlah, 0);
  const totalPosProduk = kasTransaksis
    .filter((k) => k.tipe === "PEMASUKAN" && k.sumber === "POS_PRODUK")
    .reduce((s, k) => s + k.jumlah, 0);
  const totalMakananVerified = kasTransaksis
    .filter((k) => k.tipe === "PEMASUKAN" && k.sumber === "MAKANAN")
    .reduce((s, k) => s + k.jumlah, 0);

  return {
    totalTiketVerified,
    totalFotoVerified,
    totalVotingVerified,
    totalPendaftaranVerified,
    totalMerchVerified,
    totalMakananVerified,
    totalPosProduk,
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
    pendapatanUsaha: await pendapatanUsahaP,
  };
}
