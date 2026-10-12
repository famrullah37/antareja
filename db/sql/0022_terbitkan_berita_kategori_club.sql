-- Terbitkan berita kategori U-15/U-19 untuk club (0019 + acuan umur 0020).
-- Hanya menyentuh yang masih draf, jadi tanggal terbit tidak berubah kalau
-- admin sudah menerbitkannya duluan.
UPDATE "Berita"
SET "publish" = true,
    "publishedAt" = COALESCE("publishedAt", CURRENT_TIMESTAMP),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'kategori-u15-u19-lpkbb-antareja-2026-terbuka-untuk-club'
  AND "publish" = false;
