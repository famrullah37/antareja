-- Role Sie Humas: di bawah admin, mengurus sponsor & media partner.
-- Idempotent: aman dijalankan ulang.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SIE_HUMAS';
