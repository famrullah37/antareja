-- Lihat db/sql/0048_voucher.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "keterangan" TEXT,
    "persen" BOOLEAN NOT NULL DEFAULT false,
    "nilai" INTEGER NOT NULL,
    "maksPotongan" INTEGER,
    "jenjang" "Jenjang",
    "asalSekolah" TEXT,
    "kuota" INTEGER,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "sumberTimId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Voucher_kode_key" ON "Voucher"("kode");
CREATE INDEX "Voucher_sumberTimId_idx" ON "Voucher"("sumberTimId");
ALTER TABLE "Pembayaran" ADD COLUMN "voucherId" TEXT;
ALTER TABLE "Pembayaran" ADD COLUMN "potongan" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "Pembayaran_voucherId_idx" ON "Pembayaran"("voucherId");
ALTER TABLE "Pembayaran" ADD CONSTRAINT "Pembayaran_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
