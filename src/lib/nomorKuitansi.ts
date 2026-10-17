import prisma from "@/lib/prisma";
import { formatNomorKuitansi } from "@/lib/kuitansi";

// Nomor kuitansi = satu nomor per kuitansi yang DITERBITKAN. Generate ulang / unduh ulang untuk
// status pembayaran yang sama memakai nomor & tanggal terbit yang sama; kalau status berubah
// (DP → Lunas) terbit kuitansi baru dengan nomor baru. Nomor tidak pernah dipakai ulang.
// (Sengaja bukan server action — tidak boleh bisa dipanggil langsung dari browser.)
export async function ensureNomorKuitansi(timId: string) {
  return prisma.$transaction(async (tx) => {
    // Kunci baris supaya dua request bersamaan tidak sama-sama menerbitkan nomor baru.
    await tx.$queryRaw`SELECT id FROM "Pembayaran" WHERE tim_id = ${timId} FOR UPDATE`;
    const p = await tx.pembayaran.findUnique({ where: { tim_id: timId } });
    if (!p) return null;
    if (p.nomorKuitansi && p.kuitansiTanggal && p.kuitansiIsDP === p.isDP) {
      return { nomor: p.nomorKuitansi, tanggal: p.kuitansiTanggal };
    }
    const konfig = await tx.konfigUmum.upsert({
      where: { id: "singleton" },
      update: { counterKuitansi: { increment: 1 } },
      create: { id: "singleton", counterKuitansi: 1 },
    });
    const tanggal = new Date();
    const nomor = formatNomorKuitansi(konfig.counterKuitansi, tanggal);
    await tx.pembayaran.update({
      where: { tim_id: timId },
      data: { nomorKuitansi: nomor, kuitansiTanggal: tanggal, kuitansiIsDP: p.isDP },
    });
    return { nomor, tanggal };
  });
}

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function nomorBaru(tx: TxClient) {
  const konfig = await tx.konfigUmum.upsert({
    where: { id: "singleton" },
    update: { counterKuitansi: { increment: 1 } },
    create: { id: "singleton", counterKuitansi: 1 },
  });
  const tanggal = new Date();
  return { nomor: formatNomorKuitansi(konfig.counterKuitansi, tanggal), tanggal };
}

// Kuitansi tiket penonton / foto premium: satu nomor per transaksi terverifikasi
// (counter bersama kuitansi pendaftaran, jadi nomornya tidak pernah bentrok).
// Unduh ulang memakai nomor & tanggal yang sama.
export async function ensureNomorKuitansiTiket(id: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "TransaksiTiket" WHERE id = ${id} FOR UPDATE`;
    const t = await tx.transaksiTiket.findUnique({ where: { id }, select: { nomorKuitansi: true, kuitansiTanggal: true } });
    if (!t) return null;
    if (t.nomorKuitansi && t.kuitansiTanggal) return { nomor: t.nomorKuitansi, tanggal: t.kuitansiTanggal };
    const baru = await nomorBaru(tx);
    await tx.transaksiTiket.update({ where: { id }, data: { nomorKuitansi: baru.nomor, kuitansiTanggal: baru.tanggal } });
    return baru;
  });
}

export async function ensureNomorKuitansiFoto(id: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "TransaksiFoto" WHERE id = ${id} FOR UPDATE`;
    const t = await tx.transaksiFoto.findUnique({ where: { id }, select: { nomorKuitansi: true, kuitansiTanggal: true } });
    if (!t) return null;
    if (t.nomorKuitansi && t.kuitansiTanggal) return { nomor: t.nomorKuitansi, tanggal: t.kuitansiTanggal };
    const baru = await nomorBaru(tx);
    await tx.transaksiFoto.update({ where: { id }, data: { nomorKuitansi: baru.nomor, kuitansiTanggal: baru.tanggal } });
    return baru;
  });
}
