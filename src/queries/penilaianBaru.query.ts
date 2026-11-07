import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ─── Nilai Diskrit Master ─────────────────────────────────────────────────────

export async function findNilaiDiskritMasters(
  where?: Prisma.NilaiDiskritMasterWhereInput
) {
  return prisma.nilaiDiskritMaster.findMany({
    where,
    orderBy: [{ kategori: "asc" }, { urutan: "asc" }],
  });
}

export async function upsertNilaiDiskritMaster(
  kategori: string,
  predikat: string,
  data: Prisma.NilaiDiskritMasterUncheckedCreateInput
) {
  return prisma.nilaiDiskritMaster.upsert({
    where: { kategori_predikat: { kategori, predikat } },
    create: data,
    update: { nilai: data.nilai, warna: data.warna },
  });
}

export async function deleteNilaiDiskritMaster(id: string) {
  return prisma.nilaiDiskritMaster.delete({ where: { id } });
}

// ─── Sub Kategori Master ──────────────────────────────────────────────────────

export async function findSubKategoriMasters(
  where?: Prisma.SubKategoriMasterWhereInput
) {
  return prisma.subKategoriMaster.findMany({
    where,
    orderBy: [{ kategori: "asc" }, { urutan: "asc" }],
  });
}

export async function createSubKategoriMaster(
  data: Prisma.SubKategoriMasterCreateInput
) {
  return prisma.subKategoriMaster.create({ data });
}

export async function updateSubKategoriMaster(
  id: string,
  data: Prisma.SubKategoriMasterUpdateInput
) {
  return prisma.subKategoriMaster.update({ where: { id }, data });
}

export async function deleteSubKategoriMaster(id: string) {
  return prisma.subKategoriMaster.delete({ where: { id } });
}

// ─── JuriKategori ─────────────────────────────────────────────────────────────

export async function findJuriKategoris(
  where?: Prisma.JuriKategoriWhereInput
) {
  return prisma.juriKategori.findMany({
    where,
    include: { juri: true },
  });
}

export async function upsertJuriKategori(juriId: string, kategori: string) {
  return prisma.juriKategori.upsert({
    where: { juriId_kategori: { juriId, kategori } },
    create: { juriId, kategori },
    update: {},
  });
}

export async function deleteJuriKategori(id: string) {
  return prisma.juriKategori.delete({ where: { id } });
}

// ─── PenilaianBaru ────────────────────────────────────────────────────────────

export async function findPenilaianBarus(
  where?: Prisma.PenilaianBaruWhereInput
) {
  return prisma.penilaianBaru.findMany({
    where,
    include: {
      tim: true,
      nilaiJuri: { include: { juri: true, subKategori: true } },
      pelanggaranTim: { include: { pelanggaran: true } },
    },
    orderBy: { nilaiAkhir: "desc" },
  });
}

export async function findPenilaianBaru(
  where: Prisma.PenilaianBaruWhereUniqueInput
) {
  return prisma.penilaianBaru.findUnique({
    where,
    include: {
      tim: true,
      nilaiJuri: { include: { juri: true, subKategori: true } },
      pelanggaranTim: { include: { pelanggaran: true } },
      // Tanpa nama file — rekaman diputar lewat /api/masukan-suara/[id] yang memeriksa hak akses.
      masukanSuara: {
        select: { id: true, juriId: true, durasiDetik: true, updatedAt: true, juri: { select: { nama: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function upsertPenilaianBaru(timId: string) {
  return prisma.penilaianBaru.upsert({
    where: { timId },
    create: { timId },
    update: {},
  });
}

// Hitung ulang total dari NilaiJuri & PelanggaranTim. Baris PenilaianBaru dikunci
// (FOR UPDATE) selama baca-hitung-tulis: dulu dua juri yang menyimpan nilai tim yang
// sama hampir bersamaan bisa saling menimpa — hitungan yang membaca data lama
// (sebelum nilai juri lain masuk) tertulis terakhir, sehingga nilaiAkhir tersimpan
// lebih rendah dari seharusnya walau NilaiJuri-nya benar. Dengan kunci, penghitungan
// berjalan bergantian dan yang terakhir selalu membaca semua nilai yang sudah tersimpan.
export type TxPenilaian = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// Batas antre kunci dinaikkan dari bawaan Prisma (2 dtk/5 dtk): saat banyak juri
// menyimpan tim yang sama, transaksi berikutnya menunggu giliran, bukan gagal.
const OPSI_TX = { maxWait: 10_000, timeout: 20_000 };

async function hitungTotalDalamTx(tx: TxPenilaian, penilaianId: string) {
  const nilai = await tx.nilaiJuri.aggregate({ where: { penilaianId }, _sum: { nilaiDipilih: true } });
  const pengurang = await tx.pelanggaranTim.aggregate({ where: { penilaianId }, _sum: { totalPengurang: true } });
  const nilaiKotor = nilai._sum.nilaiDipilih ?? 0;
  const totalPengurang = pengurang._sum.totalPengurang ?? 0;
  const nilaiAkhir = Math.max(0, nilaiKotor - totalPengurang);
  return tx.penilaianBaru.update({
    where: { id: penilaianId },
    data: { nilaiKotor, totalPengurang, nilaiAkhir },
  });
}

// Ubah nilai/pelanggaran SEKALIGUS hitung ulang total dalam SATU transaksi, dengan
// baris PenilaianBaru dikunci (FOR UPDATE):
//  - perubahan & total selalu konsisten — dulu nilai juri tersimpan di transaksi
//    terpisah, sehingga kalau hitung ulang gagal, total tertinggal (basi);
//  - status publish dicek ulang SETELAH kunci didapat — "Publish semua" menunggu
//    simpanan yang sedang berjalan selesai, dan simpanan yang datang setelah publish
//    ditolak, jadi nilai tidak bisa berubah diam-diam setelah diumumkan.
export class NilaiSudahDipublish extends Error {}

export async function ubahPenilaianTerkunci(penilaianId: string, ubah: (tx: TxPenilaian) => Promise<unknown>) {
  return prisma.$transaction(async (tx) => {
    const baris = await tx.$queryRaw<{ published: boolean }[]>`
      SELECT published FROM "PenilaianBaru" WHERE id = ${penilaianId} FOR UPDATE`;
    if (baris.length === 0) throw new Error("Penilaian tidak ditemukan");
    if (baris[0].published) throw new NilaiSudahDipublish();
    await ubah(tx);
    return hitungTotalDalamTx(tx, penilaianId);
  }, OPSI_TX);
}

// Hitung ulang total saja (tombol "Hitung ulang semua nilai"). Tidak menolak nilai
// yang sudah dipublish: ini hanya menyamakan total dengan nilai yang tersimpan.
export async function recalcPenilaianBaru(penilaianId: string) {
  return prisma.$transaction(async (tx) => {
    const kunci = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "PenilaianBaru" WHERE id = ${penilaianId} FOR UPDATE`;
    if (kunci.length === 0) return null;
    return hitungTotalDalamTx(tx, penilaianId);
  }, OPSI_TX);
}

// ─── NilaiJuri ────────────────────────────────────────────────────────────────

export async function upsertNilaiJuri(
  penilaianId: string,
  juriId: string,
  subKategoriId: string,
  nilaiDipilih: number,
  predikat: string,
  catatan?: string
) {
  return prisma.nilaiJuri.upsert({
    where: {
      penilaianId_juriId_subKategoriId: { penilaianId, juriId, subKategoriId },
    },
    create: { penilaianId, juriId, subKategoriId, nilaiDipilih, predikat, catatan },
    update: { nilaiDipilih, predikat, catatan },
  });
}

// ─── Pelanggaran Master ───────────────────────────────────────────────────────

export async function findPelanggarans(
  where?: Prisma.PelanggaranWhereInput
) {
  return prisma.pelanggaran.findMany({ where, orderBy: { kode: "asc" } });
}

export async function createPelanggaran(
  data: Prisma.PelanggaranCreateInput
) {
  return prisma.pelanggaran.create({ data });
}

export async function updatePelanggaran(
  id: string,
  data: Prisma.PelanggaranUpdateInput
) {
  return prisma.pelanggaran.update({ where: { id }, data });
}

export async function deletePelanggaran(id: string) {
  return prisma.pelanggaran.delete({ where: { id } });
}

// ─── Kategori Lomba ───────────────────────────────────────────────────────────

export async function findKategoriLombas() {
  return prisma.kategoriLomba.findMany({ orderBy: { nama: "asc" } });
}

// ─── PelanggaranTim ───────────────────────────────────────────────────────────

export async function upsertPelanggaranTim(
  penilaianId: string,
  pelanggaranId: string,
  jumlahKejadian: number,
  poinPerKejadian: number
) {
  const totalPengurang = jumlahKejadian * poinPerKejadian;
  return prisma.pelanggaranTim.upsert({
    where: {
      // karena tidak ada @@unique, gunakan findFirst + create/update
      id: "noop",
    },
    create: { penilaianId, pelanggaranId, jumlahKejadian, totalPengurang },
    update: { jumlahKejadian, totalPengurang },
  });
}

export async function createPelanggaranTim(
  penilaianId: string,
  pelanggaranId: string,
  jumlahKejadian: number,
  poinPerKejadian: number
) {
  const totalPengurang = jumlahKejadian * Math.abs(poinPerKejadian);
  return prisma.pelanggaranTim.create({
    data: { penilaianId, pelanggaranId, jumlahKejadian, totalPengurang },
  });
}

export async function deletePelanggaranTim(id: string) {
  return prisma.pelanggaranTim.delete({ where: { id } });
}
