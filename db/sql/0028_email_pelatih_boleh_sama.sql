-- Email anggota: satu pelatih boleh melatih 2 tim atau lebih (dari akun
-- berbeda), jadi email posisi PELATIH boleh muncul di beberapa tim. Posisi lain
-- (Official, Danton, pasukan) tetap unik global seperti sebelumnya.
-- Idempotent: aman dijalankan ulang.
DROP INDEX IF EXISTS "Anggota_email_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Anggota_email_non_pelatih_key" ON "Anggota"("email") WHERE "posisi" <> 'PELATIH';
CREATE INDEX IF NOT EXISTS "Anggota_email_idx" ON "Anggota"("email");
