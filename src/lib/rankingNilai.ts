// Aturan urutan juara (juklak): nilai akhir tertinggi; kalau SAMA, penentunya nilai
// kategori PBB (jumlah nilai semua juri di sub-kategori PBB). Kalau PBB juga sama,
// tim dianggap SERI dan diputuskan panitia (ditandai di tampilan).
// Modul murni (tanpa prisma) — dipakai di server & komponen klien, supaya SEMUA
// daftar ranking (rekap, penghargaan, sertifikat, pengumuman, voucher) konsisten.

export const KATEGORI_PENENTU_SERI = "PBB";

type NilaiPerSub = { nilaiDipilih: number; subKategori: { kategori: string } };

export function nilaiPenentuSeri(nilaiJuri: NilaiPerSub[]) {
  return nilaiJuri
    .filter((n) => n.subKategori.kategori.trim().toUpperCase() === KATEGORI_PENENTU_SERI)
    .reduce((s, n) => s + n.nilaiDipilih, 0);
}

type Peringkat = { nilaiAkhir: number; nilaiPBB: number };

export function bandingkanRanking(a: Peringkat, b: Peringkat) {
  return b.nilaiAkhir - a.nilaiAkhir || b.nilaiPBB - a.nilaiPBB;
}

export function seri(a: Peringkat | undefined, b: Peringkat | undefined) {
  return !!a && !!b && a.nilaiAkhir === b.nilaiAkhir && a.nilaiPBB === b.nilaiPBB;
}

// Untuk tampilan: apakah item ke-idx seri dengan tetangganya, dan apakah
// urutannya ditentukan oleh PBB (nilai akhir sama dengan tetangga, PBB beda).
export function statusSeri<T extends Peringkat>(list: T[], idx: number) {
  const x = list[idx];
  const tetangga = [list[idx - 1], list[idx + 1]].filter(Boolean) as T[];
  return {
    seri: tetangga.some((t) => seri(x, t)),
    olehPBB: tetangga.some((t) => t.nilaiAkhir === x.nilaiAkhir && t.nilaiPBB !== x.nilaiPBB),
  };
}

export function labelSeri(s: { seri: boolean; olehPBB: boolean }) {
  return s.seri ? "SERI (PBB juga sama) — putuskan panitia" : s.olehPBB ? "Nilai sama — urutan dari nilai PBB" : null;
}
