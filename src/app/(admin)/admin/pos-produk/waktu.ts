// Awal hari ini (00:00 WIB) dalam bentuk Date UTC — untuk rekap "hari ini"
// yang tidak bergeser walau server berjalan di zona waktu UTC.
export function awalHariWib(now = new Date()) {
  const WIB = 7 * 60 * 60 * 1000;
  const wib = new Date(now.getTime() + WIB);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()) - WIB);
}
