-- Lihat db/sql/0013_konfig_dokumen_peserta.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
ALTER TABLE "KonfigUmum" ADD COLUMN "dokumenPeserta" JSONB;
