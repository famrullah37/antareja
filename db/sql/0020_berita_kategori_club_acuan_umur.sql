-- Lengkapi tanggal acuan umur di berita kategori club (0019): umur dihitung
-- per 31 Desember 2026. Hanya menyentuh draf yang belum terbit; kalau kalimat
-- aslinya sudah diubah admin, REPLACE tidak menemukan apa-apa (aman, no-op).
UPDATE "Berita"
SET "konten" = REPLACE(REPLACE("konten",
      'berusia maksimal 15 tahun.', 'berusia maksimal 15 tahun pada 31 Desember 2026.'),
      'berusia maksimal 19 tahun.', 'berusia maksimal 19 tahun pada 31 Desember 2026.'),
    "ringkasan" = 'LPKBB Antareja 2026 membuka kategori U-15 untuk tim SMP maupun club, dan kategori U-19 untuk tim SMA maupun club. Umur peserta dihitung per 31 Desember 2026, dicek dari tanggal lahir anggota.',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'kategori-u15-u19-lpkbb-antareja-2026-terbuka-untuk-club'
  AND "publish" = false;
