-- Link Google Drive poster tim, diisi sendiri oleh pelatih/tim lewat dashboard
-- (sama pola dengan linkRekomendasi). Kolom KonfigUmum.posterUrl dari versi
-- sebelumnya (link poster global di Pengaturan) tidak dipakai lagi.
-- Idempotent: aman dijalankan ulang.
ALTER TABLE "Tim" ADD COLUMN IF NOT EXISTS "linkPoster" TEXT;
ALTER TABLE "KonfigUmum" DROP COLUMN IF EXISTS "posterUrl";
