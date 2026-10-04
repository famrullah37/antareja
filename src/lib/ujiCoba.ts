// Logika slot uji coba lapangan (tanpa akses database, dipakai server & client).
// Slot tidak disimpan per baris: dihitung dari sesi (mulai–selesai, per
// durasiMenit). Yang disimpan hanya slot yang dipilih tim (UjiCobaTim).

export type SesiWaktu = { mulai: Date; selesai: Date; durasiMenit: number };

// Batas aman supaya sesi salah input (mis. salah tanggal selesai) tidak
// menghasilkan ribuan slot.
export const MAKS_SLOT_PER_SESI = 200;

export function daftarSlot(sesi: SesiWaktu): Date[] {
  const langkah = sesi.durasiMenit * 60_000;
  const akhir = new Date(sesi.selesai).getTime();
  const slot: Date[] = [];
  for (let t = new Date(sesi.mulai).getTime(); t + langkah <= akhir; t += langkah) {
    slot.push(new Date(t));
    if (slot.length >= MAKS_SLOT_PER_SESI) break;
  }
  return slot;
}

// Slot valid = tepat di kelipatan durasi dari awal sesi & selesai sebelum sesi berakhir.
export function slotValid(sesi: SesiWaktu, mulai: Date): boolean {
  return daftarSlot(sesi).some((s) => s.getTime() === mulai.getTime());
}

export function selesaiSlot(mulai: Date, durasiMenit: number): Date {
  return new Date(new Date(mulai).getTime() + durasiMenit * 60_000);
}

// Tim boleh pilih/ganti/batal sendiri selama belum lewat batas dari admin.
export function ujiCobaTerkunci(batas: Date | null, now = new Date()): boolean {
  return !!batas && now.getTime() > new Date(batas).getTime();
}

// Format selalu WIB (bukan zona waktu browser/server) supaya jadwal yang dilihat
// tim luar daerah & yang dicetak panitia sama persis.
const ZONA = "Asia/Jakarta";

export function formatJamWib(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: ZONA,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(d))
    .replace(":", ".");
}

export function formatTanggalWib(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: ZONA,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(d));
}

export function formatRentangSlot(mulai: Date, durasiMenit: number): string {
  return `${formatJamWib(mulai)}–${formatJamWib(selesaiSlot(mulai, durasiMenit))} WIB`;
}

// Nilai <input type="datetime-local"> dalam WIB (kebalikan parseWibDatetimeLocal).
export function toWibDatetimeLocal(d: Date | null | undefined): string {
  if (!d) return "";
  const wib = new Date(new Date(d).getTime() + 7 * 3_600_000);
  return wib.toISOString().slice(0, 16);
}
