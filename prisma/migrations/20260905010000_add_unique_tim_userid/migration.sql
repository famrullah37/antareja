-- Enforce "satu akun satu tim" at the database level. Sebelumnya cuma dicek
-- di aplikasi (registrationForm.ts) sebelum transaksi dibuat — dua submit
-- bersamaan (klik ganda / dua tab) bisa lolos keduanya dan membuat 2 tim untuk
-- 1 akun. Sudah dicek: tidak ada baris Tim dengan userId duplikat saat ini.
ALTER TABLE "Tim" ADD CONSTRAINT "Tim_userId_key" UNIQUE ("userId");
