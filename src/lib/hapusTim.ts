import { Prisma } from "@prisma/client";

export const TANDA_KAS_TIM_DIHAPUS = "[TIM DIHAPUS] ";

// Kas pendaftaran sengaja TIDAK ikut dihapus bersama timnya (uangnya bisa
// sudah benar-benar masuk rekening), tapi diberi tanda supaya di laporan kas
// kelihatan pemasukan ini tidak lagi punya tim — dulu tidak ada jejak sama
// sekali (kasus tim "syueb", 2 Nov 2026).
export async function tandaiKasTimDihapus(tx: Pick<Prisma.TransactionClient, "$executeRaw">,timIds: string[]) {
  if (timIds.length === 0) return;
  await tx.$executeRaw`
    UPDATE "KasTransaksi"
    SET keterangan = ${TANDA_KAS_TIM_DIHAPUS} || keterangan
    WHERE sumber = 'PENDAFTARAN'
      AND "referensiId" IN (${Prisma.join(timIds)})
      AND keterangan NOT LIKE ${TANDA_KAS_TIM_DIHAPUS + "%"}
  `;
}

export function ringkasTimDihapus(tim: {
  nama_tim: string;
  asal_sekolah: string;
  jenjang: string;
  confirmed: boolean;
  pembayaran?: { isDP: boolean } | null;
}) {
  const status = tim.confirmed ? (tim.pembayaran?.isDP ? "terkonfirmasi DP" : "terkonfirmasi LUNAS") : "belum terkonfirmasi";
  return `Tim ${tim.nama_tim} — ${tim.asal_sekolah} (${tim.jenjang}, ${status})`;
}
