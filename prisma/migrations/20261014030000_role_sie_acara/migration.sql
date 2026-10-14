-- Lihat db/sql/0027_role_sie_acara.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
ALTER TYPE "Role" ADD VALUE 'SIE_ACARA';
