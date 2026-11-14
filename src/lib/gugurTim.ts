// Tim gugur = tidak ikut lomba: mengundurkan diri (bisa jauh hari, dari menu Tim)
// atau tidak hadir / tidak registrasi ulang (di Presensi DP). Modul murni (tanpa
// prisma) — dipakai server & tampilan.
//
// Aturan:
// - Ditandai panitia secara tegas, TIDAK PERNAH otomatis dari "belum presensi",
//   supaya tim yang datang tidak tersisih karena petugas lupa mencentang.
// - Tim gugur tidak tampil di daftar penilaian juri, nilainya ditolak, tidak ikut
//   rekap & juara, dan sertifikat tidak diterbitkan. Bisa dibatalkan.
// - Voting: mundur SEBELUM voting dibuka & belum punya vote → keluar dari voting.
//   Tidak hadir di hari H, atau mundur saat voting sudah berjalan → tetap tampil di
//   voting (dukungan yang sudah dibayar tidak hilang).

export const JENIS_GUGUR = {
  MUNDUR: "Mengundurkan diri",
  TIDAK_HADIR: "Tidak hadir",
} as const;

export type JenisGugur = keyof typeof JENIS_GUGUR;

export function isJenisGugur(x: unknown): x is JenisGugur {
  return typeof x === "string" && x in JENIS_GUGUR;
}

// Data tanpa jenis dianggap "Tidak hadir".
export function labelGugur(jenis: string | null | undefined) {
  return isJenisGugur(jenis) ? JENIS_GUGUR[jenis] : JENIS_GUGUR.TIDAK_HADIR;
}

// Filter Prisma untuk tim yang ikut lomba (dinilai, masuk rekap & juara).
export const TIM_IKUT_LOMBA = { confirmed: true, gugurAt: null } as const;
