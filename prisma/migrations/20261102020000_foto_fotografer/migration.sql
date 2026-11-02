-- Lihat db/sql/0042_foto_fotografer.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
ALTER TABLE "Foto" ADD COLUMN "fotograferId" TEXT;
CREATE INDEX "Foto_fotograferId_idx" ON "Foto"("fotograferId");
