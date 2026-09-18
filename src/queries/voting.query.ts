import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Kategori dukungan. "tim_favorit" selalu ada (bawaan, tidak disimpan di
// KonfigVoting.kategoriList) — dihitung lewat Tim.totalVote seperti semula.
// Kategori tambahan (admin bisa tambah lewat halaman Pengaturan Voting)
// dihitung lewat tabel VotingTally.
export type KategoriVoting = {
  key: string;
  label: string;
  unit: "TIM" | "PELATIH" | "DANTON";
};

export const KATEGORI_BAWAAN: KategoriVoting = { key: "tim_favorit", label: "Tim Favorit", unit: "TIM" };

export function getKategoriList(konfig: { kategoriList?: unknown } | null): KategoriVoting[] {
  const extra = Array.isArray(konfig?.kategoriList) ? (konfig!.kategoriList as KategoriVoting[]) : [];
  return [KATEGORI_BAWAAN, ...extra];
}

export async function findKonfigVoting() {
  return prisma.konfigVoting.findUnique({ where: { id: "singleton" } });
}

export async function upsertKonfigVoting(data: {
  aktif?: boolean;
  nominalVote?: number;
  bankNama?: string;
  bankNoRek?: string;
  bankAtasNama?: string;
  mulaiPada?: Date | null;
  tutupPada?: Date | null;
  kategoriList?: KategoriVoting[];
}) {
  return prisma.konfigVoting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });
}

export async function findTimsForVoting() {
  return prisma.tim.findMany({
    where: { confirmed: true },
    select: {
      id: true,
      nama_tim: true,
      asal_sekolah: true,
      jenjang: true,
      pelatih: true,
      totalVote: true,
      foto: true,
    },
    orderBy: { totalVote: "desc" },
  });
}

// Nama Danton per tim (posisi DANTON) — dipakai kategori dukungan bertipe
// "DANTON". Tim yang belum isi Danton tidak akan punya entri di map ini.
export async function findDantonMap(): Promise<Record<string, string>> {
  const dantons = await prisma.anggota.findMany({
    where: { posisi: "DANTON", Tim: { confirmed: true } },
    select: { timId: true, nama: true },
  });
  return Object.fromEntries(dantons.map((d) => [d.timId, d.nama]));
}

// Total dukungan per tim per kategori tambahan (di luar tim_favorit), untuk
// ditampilkan sebagai leaderboard tiap kategori tanpa query ulang per tab.
export async function findVotingTallyMap(): Promise<Record<string, Record<string, number>>> {
  const rows = await prisma.votingTally.findMany();
  const map: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    map[row.timId] ??= {};
    map[row.timId][row.kategori] = row.total;
  }
  return map;
}

export async function findTransaksiVotings(where?: Prisma.TransaksiVotingWhereInput) {
  return prisma.transaksiVoting.findMany({
    where,
    include: { tim: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function findTransaksiVoting(where: Prisma.TransaksiVotingWhereUniqueInput) {
  return prisma.transaksiVoting.findUnique({
    where,
    include: { tim: true },
  });
}

export async function createTransaksiVoting(data: Prisma.TransaksiVotingCreateInput) {
  return prisma.transaksiVoting.create({ data });
}

export async function updateTransaksiVoting(
  where: Prisma.TransaksiVotingWhereUniqueInput,
  data: Prisma.TransaksiVotingUpdateInput
) {
  return prisma.transaksiVoting.update({ where, data });
}
