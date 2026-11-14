-- Galeri: snapshot pemilik foto per transaksi, supaya riwayat pendapatan
-- fotografer tetap ada walau foto/album/akun dihapus.
-- Idempotent: aman dijalankan ulang (backfill hanya baris yang masih kosong,
-- dari data foto yang masih ada).
ALTER TABLE "TransaksiFoto" ADD COLUMN IF NOT EXISTS "pemilikFoto" JSONB;
UPDATE "TransaksiFoto" t SET "pemilikFoto" = (SELECT jsonb_agg(jsonb_build_object('fotoId', f."id", 'albumId', f."albumId", 'fotograferId', COALESCE(f."fotograferId", a."fotograferId"), 'fotograferNama', u."nama")) FROM "Foto" f JOIN "Album" a ON a."id" = f."albumId" LEFT JOIN "User" u ON u."id" = COALESCE(f."fotograferId", a."fotograferId") WHERE t."fotoList" @> jsonb_build_array(f."id")) WHERE t."pemilikFoto" IS NULL;
