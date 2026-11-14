-- Lihat db/sql/0057_transaksi_foto_pemilik.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs. File ini cuma cerminan.
ALTER TABLE "TransaksiFoto" ADD COLUMN "pemilikFoto" JSONB;
UPDATE "TransaksiFoto" t SET "pemilikFoto" = (SELECT jsonb_agg(jsonb_build_object('fotoId', f."id", 'albumId', f."albumId", 'fotograferId', COALESCE(f."fotograferId", a."fotograferId"), 'fotograferNama', u."nama")) FROM "Foto" f JOIN "Album" a ON a."id" = f."albumId" LEFT JOIN "User" u ON u."id" = COALESCE(f."fotograferId", a."fotograferId") WHERE t."fotoList" @> jsonb_build_array(f."id")) WHERE t."pemilikFoto" IS NULL;
