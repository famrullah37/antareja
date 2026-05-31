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

export async function recalcPenilaianBaru(penilaianId: string) {
  const penilaian = await prisma.penilaianBaru.findUnique({
    where: { id: penilaianId },
    include: {
      nilaiJuri: true,
      pelanggaranTim: true,
    },
  });
  if (!penilaian) return;

  const nilaiKotor = penilaian.nilaiJuri.reduce(
    (sum, n) => sum + n.nilaiDipilih,
    0
  );
  const totalPengurang = penilaian.pelanggaranTim.reduce(
    (sum, p) => sum + p.totalPengurang,
    0
  );
  const nilaiAkhir = Math.max(0, nilaiKotor - totalPengurang);

  return prisma.penilaianBaru.update({
    where: { id: penilaianId },
    data: { nilaiKotor, totalPengurang, nilaiAkhir },
  });
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
