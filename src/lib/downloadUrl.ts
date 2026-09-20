// Cloudinary: sisipkan fl_attachment supaya browser mengunduh file (bukan membukanya),
// `download` attribute pada <a> diabaikan untuk URL beda-origin. Nama file opsional
// (tanpa ekstensi — Cloudinary menambahkannya sendiri).
export function toDownloadUrl(url: string, filename?: string) {
  if (!url.includes("/upload/")) return url;
  const safe = filename
    ?.normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return url.replace("/upload/", `/upload/fl_attachment${safe ? ":" + safe : ""}/`);
}
