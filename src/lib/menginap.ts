// Helper pengajuan menginap (lihat actions/Menginap.ts). Tanggal disimpan
// sebagai kolom DATE (tanpa jam) — Prisma membacanya sebagai tengah malam UTC,
// jadi parsing & format selalu di UTC supaya tanggalnya tidak bergeser sehari.

export const STATUS_MENGINAP = {
  PENDING: { label: "Menunggu persetujuan", cls: "bg-yellow-50 border-yellow-200 text-yellow-800" },
  DISETUJUI: { label: "Disetujui", cls: "bg-green-50 border-green-200 text-green-800" },
  DITOLAK: { label: "Ditolak", cls: "bg-red-50 border-red-200 text-red-700" },
} as const;

export type StatusMenginap = keyof typeof STATUS_MENGINAP;

export const MAKS_ORANG_MENGINAP = 200;
export const MAKS_MALAM_MENGINAP = 14;

// Nilai <input type="date"> ("YYYY-MM-DD") → Date tengah malam UTC.
export function parseTanggal(raw: string | null | undefined): Date | null {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

export function toInputTanggal(d: Date | null | undefined): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export function formatTanggalMenginap(d: Date): string {
  return new Date(d).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function jumlahMalam(datang: Date, pulang: Date): number {
  return Math.round((new Date(pulang).getTime() - new Date(datang).getTime()) / 86_400_000);
}

// Hari ini menurut WIB, sebagai tengah malam UTC (bisa dibandingkan dengan kolom DATE).
export function hariIniWib(now = new Date()): Date {
  return parseTanggal(new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10))!;
}
