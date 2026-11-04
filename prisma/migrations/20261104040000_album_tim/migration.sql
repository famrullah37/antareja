-- Lihat db/sql/0047_album_tim.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent, termasuk pencocokan album lama). File ini cuma cerminan.
ALTER TABLE "Album" ADD COLUMN "timId" TEXT;
CREATE INDEX "Album_timId_idx" ON "Album"("timId");
