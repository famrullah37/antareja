-- Lihat db/sql/0028_email_pelatih_boleh_sama.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
DROP INDEX "Anggota_email_key";
CREATE UNIQUE INDEX "Anggota_email_non_pelatih_key" ON "Anggota"("email") WHERE "posisi" <> 'PELATIH';
CREATE INDEX "Anggota_email_idx" ON "Anggota"("email");
