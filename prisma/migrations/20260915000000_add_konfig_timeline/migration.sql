-- Tambah kolom timeline (JSON, opsional) di KonfigUmum untuk section
-- Timeline di halaman utama — null berarti belum diisi admin, pakai
-- default hardcoded di Timeline.tsx.
ALTER TABLE "KonfigUmum" ADD COLUMN "timeline" JSONB;
