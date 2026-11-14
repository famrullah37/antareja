import prisma from "@/lib/prisma";
import { TIM_IKUT_LOMBA } from "@/lib/gugurTim";
import { Jenjang, Prisma } from "@prisma/client";
import { bandingkanRanking, nilaiPenentuSeri } from "@/lib/rankingNilai";

export async function findKonfigJuaras(where?: Prisma.KonfigJuaraWhereInput) {
  return prisma.konfigJuara.findMany({
    where,
    orderBy: [{ jenisJuara: "asc" }, { jenjang: "asc" }, { urutan: "asc" }],
  });
}

export async function findKonfigJuara(where: Prisma.KonfigJuaraWhereUniqueInput) {
  return prisma.konfigJuara.findUnique({ where });
}

export async function createKonfigJuara(data: Prisma.KonfigJuaraCreateInput) {
  return prisma.konfigJuara.create({ data });
}

export async function updateKonfigJuara(
  where: Prisma.KonfigJuaraWhereUniqueInput,
  data: Prisma.KonfigJuaraUpdateInput
) {
  return prisma.konfigJuara.update({ where, data });
}

export async function deleteKonfigJuara(where: Prisma.KonfigJuaraWhereUniqueInput) {
  return prisma.konfigJuara.delete({ where });
}

// kategoriList kosong = semua kategori (nilaiAkhir tersimpan). Kalau diisi (centang
// "Kategori yang Dihitung" di konfigurasi Juara Umum), nilai kotor hanya dari
// sub-kategori yang kategorinya dicentang; pelanggaran tetap dikurangkan seluruhnya
// karena pelanggaran adalah pengurang tim, bukan bagian kategori tertentu.
// Dulu parameter ini diabaikan sehingga centang kategori tidak berpengaruh.
export async function getRankingPerJenjang(jenjang: Jenjang, kategoriList: string[]) {
  const penilaians = await prisma.penilaianBaru.findMany({
    // Tim batal konfirmasi / mundur / tidak hadir tidak ikut jadi juara (juga sertifikat).
    where: { tim: { jenjang, ...TIM_IKUT_LOMBA } },
    include: {
      tim: true,
      nilaiJuri: { select: { nilaiDipilih: true, subKategori: { select: { kategori: true } } } },
    },
    orderBy: { nilaiAkhir: "desc" },
  });

  const dihitung = new Set(kategoriList.map((k) => k.toLowerCase()));
  const hasil = penilaians.map((p) => {
    const nilaiKotor = kategoriList.length
      ? p.nilaiJuri
          .filter((n) => dihitung.has(n.subKategori.kategori.toLowerCase()))
          .reduce((s, n) => s + n.nilaiDipilih, 0)
      : p.nilaiKotor;
    return {
      timId: p.timId,
      nama: p.tim.nama_tim,
      sekolah: p.tim.asal_sekolah,
      nilaiKotor,
      totalPengurang: p.totalPengurang,
      nilaiAkhir: kategoriList.length ? Math.max(0, nilaiKotor - p.totalPengurang) : p.nilaiAkhir,
      nilaiPBB: nilaiPenentuSeri(p.nilaiJuri),
    };
  });
  // Nilai sama → PBB lebih tinggi di atas (juklak). Dipakai juga oleh sertifikat.
  return hasil.sort(bandingkanRanking);
}
