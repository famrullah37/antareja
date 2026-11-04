-- Foto dihubungkan ke tim peserta (pencarian galeri per tim). Tanpa FK supaya
-- idempotent (lihat 0041/0042). Foto lama dicocokkan otomatis dari tagTim
-- (teks bebas): sama persis dengan nama tim, atau dengan asal sekolah yang
-- hanya punya satu tim. Sisanya tetap bisa dicari lewat teks tagTim.
ALTER TABLE "Foto" ADD COLUMN IF NOT EXISTS "timId" TEXT;
CREATE INDEX IF NOT EXISTS "Foto_timId_idx" ON "Foto"("timId");
UPDATE "Foto" f SET "timId" = t."id" FROM "Tim" t WHERE f."timId" IS NULL AND f."tagTim" IS NOT NULL AND lower(trim(f."tagTim")) = lower(trim(t."nama_tim")) AND (SELECT count(*) FROM "Tim" t2 WHERE lower(trim(t2."nama_tim")) = lower(trim(f."tagTim"))) = 1;
UPDATE "Foto" f SET "timId" = (SELECT t."id" FROM "Tim" t WHERE lower(trim(t."asal_sekolah")) = lower(trim(f."tagTim"))) WHERE f."timId" IS NULL AND f."tagTim" IS NOT NULL AND (SELECT count(*) FROM "Tim" t WHERE lower(trim(t."asal_sekolah")) = lower(trim(f."tagTim"))) = 1;
