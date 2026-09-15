// Parse nilai <input type="datetime-local"> ("YYYY-MM-DDTHH:mm", tanpa info
// zona waktu) sebagai waktu Asia/Jakarta (WIB, UTC+7). Panitia & admin situs
// ini semua di Indonesia, jadi nilai yang mereka pilih di browser dimaksud
// sebagai WIB — tapi `new Date(raw)` polos akan diparsing pakai zona waktu
// PROSES SERVER (bisa UTC kalau hosting di luar WIB), bukan zona waktu admin.
// Format ISO 8601 dengan offset eksplisit (+07:00) aman diparsing di server
// mana pun tanpa ambigu.
export function parseWibDatetimeLocal(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(`${raw}:00+07:00`);
  return isNaN(d.getTime()) ? null : d;
}
