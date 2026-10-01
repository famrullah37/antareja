// Untuk menyisipkan teks dari pengguna (nama, nama tim, sekolah) ke HTML
// email, supaya tidak bisa menyisipkan tag/link palsu ke email resmi panitia.
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
