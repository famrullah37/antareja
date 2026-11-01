// Presensi Daerah Persiapan (DP): yang dicentang hanya Danton & pasukan (yang
// turun lapangan) — Official & Pelatih tidak. Dipakai server action & tampilan admin.

export const noUrutLabel = (jenjang: string, noUrut: number | null) =>
  noUrut != null ? `${jenjang}-${String(noUrut).padStart(2, "0")}` : jenjang;

const BARIS: Record<string, number> = { SMALL: 4, NORMAL: 5 };

// Urutan tampil: Danton lalu B1S1..B4S3 (12 pasukan) / B5S3 (15 pasukan).
export function posisiPresensi(tipe: string): string[] {
  const out = ["DANTON"];
  for (let b = 1; b <= (BARIS[tipe] ?? 5); b++) for (let s = 1; s <= 3; s++) out.push(`B${b}S${s}`);
  return out;
}

export type RingkasanPresensi = { total: number; sesuai: number; slotKosong: number };

// sesuaiPerPosisi: posisi → sudah dicentang; posisi yang tidak ada di map = slot
// belum diisi tim saat pendaftaran (tidak bisa dicentang).
export function ringkasPresensi(tipe: string, sesuaiPerPosisi: Map<string, boolean>): RingkasanPresensi {
  const semua = posisiPresensi(tipe);
  return {
    total: semua.length,
    sesuai: semua.filter((p) => sesuaiPerPosisi.get(p)).length,
    slotKosong: semua.filter((p) => !sesuaiPerPosisi.has(p)).length,
  };
}

export type KondisiTim = "BELUM_HADIR" | "BELUM_LENGKAP" | "SESUAI";

export const KONDISI_TIM: Record<KondisiTim, { label: string; cls: string }> = {
  BELUM_HADIR: { label: "Belum hadir", cls: "bg-neutral-100 text-neutral-600 border-neutral-300" },
  BELUM_LENGKAP: { label: "Belum lengkap", cls: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  SESUAI: { label: "Sesuai", cls: "bg-green-100 text-green-800 border-green-300" },
};

export function kondisiTim(hadir: boolean, r: RingkasanPresensi): KondisiTim {
  if (!hadir) return "BELUM_HADIR";
  return r.sesuai === r.total ? "SESUAI" : "BELUM_LENGKAP";
}
