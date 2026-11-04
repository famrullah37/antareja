-- Lihat db/sql/0046_foto_tim.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent, termasuk pencocokan foto lama). File ini cuma cerminan.
ALTER TABLE "Foto" ADD COLUMN "timId" TEXT;
CREATE INDEX "Foto_timId_idx" ON "Foto"("timId");
