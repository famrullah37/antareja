-- Lihat db/sql/0010_role_sie_lomba.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
ALTER TYPE "Role" ADD VALUE 'SIE_LOMBA';
