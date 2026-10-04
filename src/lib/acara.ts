import type { TimelineItem } from "@/queries/konfigUmum.query";

// Tanggal & jam acara diambil dari tahap TERAKHIR timeline (Pelaksanaan Lomba)
// yang diisi admin di Pengaturan — bukan ditulis di kode — supaya tiap season
// cukup ganti di admin. Teksnya bebas, jadi diurai seadanya; kalau tidak
// terbaca, pemakai (data Event Google, halaman tiket) menyembunyikan bagiannya.

const BULAN: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, jun: 6, jul: 7,
  agu: 8, agt: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12,
};

// "14 November 2026" / "14 Nov 2026" / "1 Sep – 8 Nov 2026" (ambil tanggal terakhir).
export function parseTanggalIndonesia(teks: string): string | null {
  const cocok = Array.from(teks.matchAll(/(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})/gi));
  const m = cocok[cocok.length - 1];
  if (!m) return null;
  const bulan = BULAN[m[2].slice(0, 3).toLowerCase()];
  const hari = Number(m[1]);
  if (!bulan || hari < 1 || hari > 31) return null;
  return `${m[3]}-${String(bulan).padStart(2, "0")}-${String(hari).padStart(2, "0")}`;
}

// Jam mulai: angka jam pertama, "06.00" / "6:00" -> "06:00".
export function parseJamMulai(teks: string | undefined): string | null {
  const m = teks?.match(/(\d{1,2})[.:](\d{2})/);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

export type InfoAcara = {
  tanggalTeks: string;
  jamTeks: string | null;
  tahun: string | null;
  // Format schema.org: tanggal saja, atau tanggal+jam WIB kalau jam terbaca.
  startDate: string | null;
  endDate: string | null;
};

export function getInfoAcara(timeline: TimelineItem[] | null | undefined): InfoAcara | null {
  const lomba = timeline?.[timeline.length - 1];
  if (!lomba?.dateString) return null;
  const tanggal = parseTanggalIndonesia(lomba.dateString);
  const jam = parseJamMulai(lomba.jam);
  return {
    tanggalTeks: lomba.dateString,
    jamTeks: lomba.jam?.trim() || null,
    tahun: tanggal?.slice(0, 4) ?? null,
    startDate: tanggal ? (jam ? `${tanggal}T${jam}:00+07:00` : tanggal) : null,
    endDate: tanggal,
  };
}
