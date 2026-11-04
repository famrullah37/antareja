-- Lihat db/sql/0045_tiket_jumlah_per_tim.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
ALTER TABLE "Tiket" ADD COLUMN "jumlahPerTim" INTEGER NOT NULL DEFAULT 1;
