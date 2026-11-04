-- Satu album = satu tim (opsional). Tanpa FK supaya idempotent (lihat 0046).
-- Album lama dicocokkan otomatis dari namanya: sama persis dengan nama tim,
-- atau dengan asal sekolah yang hanya punya satu tim. Lalu semua foto di
-- album bertim ikut tim albumnya.
ALTER TABLE "Album" ADD COLUMN IF NOT EXISTS "timId" TEXT;
CREATE INDEX IF NOT EXISTS "Album_timId_idx" ON "Album"("timId");
UPDATE "Album" a SET "timId" = t."id" FROM "Tim" t WHERE a."timId" IS NULL AND lower(trim(a."nama")) = lower(trim(t."nama_tim")) AND (SELECT count(*) FROM "Tim" t2 WHERE lower(trim(t2."nama_tim")) = lower(trim(a."nama"))) = 1;
UPDATE "Album" a SET "timId" = (SELECT t."id" FROM "Tim" t WHERE lower(trim(t."asal_sekolah")) = lower(trim(a."nama"))) WHERE a."timId" IS NULL AND (SELECT count(*) FROM "Tim" t WHERE lower(trim(t."asal_sekolah")) = lower(trim(a."nama"))) = 1;
UPDATE "Foto" f SET "timId" = a."timId", "tagTim" = t."nama_tim" FROM "Album" a, "Tim" t WHERE f."albumId" = a."id" AND a."timId" = t."id" AND f."timId" IS DISTINCT FROM a."timId";
