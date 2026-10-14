import "server-only";
import prisma from "@/lib/prisma";

// Penempatan tim ke ruangan basecamp oleh panitia (actions/Basecamp.ts). Tim
// tidak memilih ruangan sendiri.

// Client di dalam prisma.$transaction (client Prisma kita di-extend, jadi bukan Prisma.TransactionClient).
export type Tx = Parameters<Extract<Parameters<typeof prisma.$transaction>[0], (...args: never[]) => unknown>>[0];

// Ditolak di dalam transaksi — pesannya diteruskan ke pengguna apa adanya.
export class Tolak extends Error {}

// Kunci baris ruangan selama transaksi — penempatan tim & ubah kapasitas ke
// ruangan yang sama jadi berurutan, jadi jumlah tim tidak bisa melewati kapasitas.
export async function kunciRuangan(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT "id" FROM "Ruangan" WHERE "id" = ${id} FOR UPDATE`;
  const r = await tx.ruangan.findUnique({ where: { id } });
  if (!r) throw new Tolak("Ruangan tidak ditemukan");
  return r;
}

// Tempatkan tim ke ruangan (null = keluarkan) dengan cek kapasitas. Harus
// dipanggil di dalam transaksi.
export async function tempatkanTim(tx: Tx, timId: string, ruanganId: string | null) {
  const ruangan = ruanganId ? await kunciRuangan(tx, ruanganId) : null;
  if (ruangan) {
    const terisi = await tx.tim.count({ where: { ruanganId: ruangan.id, NOT: { id: timId } } });
    if (terisi >= ruangan.kapasitas) throw new Tolak(`${ruangan.nama} sudah penuh (${ruangan.kapasitas} tim)`);
  }
  const tim = await tx.tim.update({ where: { id: timId }, data: { ruanganId }, select: { nama_tim: true } });
  return { tim, ruangan };
}
