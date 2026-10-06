-- Lihat db/sql/0015_role_sie_humas.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
ALTER TYPE "Role" ADD VALUE 'SIE_HUMAS';
