-- Lihat db/sql/0012_link_poster_tim.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
ALTER TABLE "Tim" ADD COLUMN "linkPoster" TEXT;
