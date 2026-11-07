import prisma from "@/lib/prisma";

// Data "Hasil Penilaian" untuk dashboard tim. NilaiAkhirSection adalah komponen
// klien, jadi SEMUA yang dikirim ke sana ikut terkirim ke browser (bisa dilihat
// lewat devtools walau tidak ditampilkan). Dulu dashboard mengirim penilaian
// lengkap apa adanya:
//  - sebelum dipublish, tim sudah bisa mengintip nilai & total sebelum pengumuman;
//  - data juri lengkap (email, no. HP) ikut terkirim.
// Sekarang: belum dipublish → hanya status; sudah dipublish → hanya field yang tampil.
export async function hasilPenilaianUntukTim(timId: string) {
  const p = await prisma.penilaianBaru.findUnique({
    where: { timId },
    select: {
      published: true,
      nilaiKotor: true,
      totalPengurang: true,
      nilaiAkhir: true,
      nilaiJuri: {
        select: {
          nilaiDipilih: true,
          predikat: true,
          catatan: true,
          juri: { select: { nama: true } },
          subKategori: { select: { kode: true, nama: true, kategori: true, maxNilai: true, urutan: true } },
        },
      },
      pelanggaranTim: {
        select: { jumlahKejadian: true, totalPengurang: true, pelanggaran: { select: { kode: true, nama: true } } },
      },
      masukanSuara: {
        select: { id: true, durasiDetik: true, updatedAt: true, juri: { select: { nama: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!p) return null;

  if (!p.published) {
    return {
      published: false,
      nilaiKotor: 0,
      totalPengurang: 0,
      nilaiAkhir: 0,
      nilaiJuri: [],
      pelanggaranTim: [],
      masukanSuara: [],
    };
  }

  return {
    ...p,
    // Urut sesuai urutan sub-kategori di master, supaya tabel per kategori rapi.
    nilaiJuri: [...p.nilaiJuri].sort((a, b) => a.subKategori.urutan - b.subKategori.urutan),
  };
}
