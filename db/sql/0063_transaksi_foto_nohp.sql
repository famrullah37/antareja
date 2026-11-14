-- No. HP pembeli foto (wajib untuk pembelian baru) supaya link unduhan bisa
-- dikirim lewat WA. Idempotent: aman dijalankan ulang.
ALTER TABLE "TransaksiFoto" ADD COLUMN IF NOT EXISTS "noHp" TEXT;
