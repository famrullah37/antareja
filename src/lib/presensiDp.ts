// Presensi Daerah Persiapan (DP) / registrasi ulang: yang dicek hanya Danton &
// pasukan (yang turun lapangan) — Official & Pelatih tidak. Dipakai server action
// & tampilan admin.
//
// Dua hal BERBEDA:
// - TIM tidak hadir / tidak registrasi ulang → status gugur tim (lib/gugurTim.ts):
//   tim tidak dinilai. Ditandai lewat tombol di halaman tim, tidak pernah otomatis.
// - ANGGOTA tidak hadir → PresensiAnggota.tidakHadir: tim tetap hadir & ikut lomba,
//   hanya anggota itu tercatat absen (kondisi "Hadir, kurang anggota").
// Urutan di DP: (1) registrasi kehadiran tim → (2) cek kehadiran tiap anggota.

export const noUrutLabel = (jenjang: string, noUrut: number | null) =>
  noUrut != null ? `${jenjang}-${String(noUrut).padStart(2, "0")}` : jenjang;

const BARIS: Record<string, number> = { SMALL: 4, NORMAL: 5 };

// Urutan tampil: Danton lalu B1S1..B4S3 (12 pasukan) / B5S3 (15 pasukan).
export function posisiPresensi(tipe: string): string[] {
  const out = ["DANTON"];
  for (let b = 1; b <= (BARIS[tipe] ?? 5); b++) for (let s = 1; s <= 3; s++) out.push(`B${b}S${s}`);
  return out;
}

// Status satu anggota: null = belum dicek petugas.
export type StatusAnggota = "SESUAI" | "TIDAK_HADIR" | null;

export function statusAnggota(p: { tidakHadir: boolean } | null | undefined): StatusAnggota {
  return !p ? null : p.tidakHadir ? "TIDAK_HADIR" : "SESUAI";
}

export type RingkasanPresensi = {
  total: number;
  sesuai: number;
  tidakHadir: number;
  slotKosong: number;
  belumDicek: number;
};

// statusPerPosisi: posisi → status; posisi yang tidak ada di map = slot belum
// diisi tim saat pendaftaran (tidak bisa dicek).
export function ringkasPresensi(tipe: string, statusPerPosisi: Map<string, StatusAnggota>): RingkasanPresensi {
  const semua = posisiPresensi(tipe);
  const sesuai = semua.filter((p) => statusPerPosisi.get(p) === "SESUAI").length;
  const tidakHadir = semua.filter((p) => statusPerPosisi.get(p) === "TIDAK_HADIR").length;
  const slotKosong = semua.filter((p) => !statusPerPosisi.has(p)).length;
  return { total: semua.length, sesuai, tidakHadir, slotKosong, belumDicek: semua.length - sesuai - tidakHadir - slotKosong };
}

export type KondisiTim = "BELUM_HADIR" | "BELUM_LENGKAP" | "KURANG_ANGGOTA" | "SESUAI" | "GUGUR";

export const KONDISI_TIM: Record<KondisiTim, { label: string; cls: string }> = {
  BELUM_HADIR: { label: "Belum registrasi", cls: "bg-neutral-100 text-neutral-600 border-neutral-300" },
  BELUM_LENGKAP: { label: "Tim hadir, anggota belum selesai dicek", cls: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  // Semua anggota sudah dicek, tapi ada yang tidak hadir / slot kosong — tim tetap lomba.
  KURANG_ANGGOTA: { label: "Hadir, kurang anggota", cls: "bg-orange-100 text-orange-800 border-orange-300" },
  SESUAI: { label: "Sesuai", cls: "bg-green-100 text-green-800 border-green-300" },
  // Tim mengundurkan diri / tidak hadir (lib/gugurTim.ts) — label rinci dari labelGugur().
  GUGUR: { label: "Mundur / tidak hadir", cls: "bg-red-100 text-red-800 border-red-300" },
};

export function kondisiTim(hadir: boolean, r: RingkasanPresensi, gugur = false): KondisiTim {
  if (gugur) return "GUGUR";
  if (!hadir) return "BELUM_HADIR";
  if (r.sesuai === r.total) return "SESUAI";
  return r.belumDicek === 0 ? "KURANG_ANGGOTA" : "BELUM_LENGKAP";
}
