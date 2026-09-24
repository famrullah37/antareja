-- Lihat db/sql/0006_link_rekomendasi_tim.sql — itu yang benar-benar
-- dijalankan lewat scripts/migrate-sql.mjs (idempotent). File ini cuma
-- cerminan supaya riwayat prisma/migrations tetap sinkron.
ALTER TABLE "Tim" ADD COLUMN "linkRekomendasi" TEXT;
