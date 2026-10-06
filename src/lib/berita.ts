// Zona WIB eksplisit: server (container) berjalan di UTC, jadi tanpa ini berita
// yang terbit 00.00–07.00 WIB tampil bertanggal kemarin — dan di komponen
// client, tanggal server (UTC) vs browser (WIB) bisa beda → hydration mismatch.
export function formatTanggalBerita(d: Date | null, month: "long" | "short" = "long") {
  return d
    ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month, year: "numeric", timeZone: "Asia/Jakarta" })
    : "";
}
