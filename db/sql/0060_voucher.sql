-- Voucher potongan biaya pendaftaran tim (kode umum & voucher pribadi untuk
-- kegiatan berikutnya yang dikunci ke asal sekolah). Idempotent: aman dijalankan ulang.
CREATE TABLE IF NOT EXISTS "Voucher" (
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
CREATE UNIQUE INDEX IF NOT EXISTS "Voucher_kode_key" ON "Voucher"("kode");
CREATE INDEX IF NOT EXISTS "Voucher_sumberTimId_idx" ON "Voucher"("sumberTimId");
ALTER TABLE "Pembayaran" ADD COLUMN IF NOT EXISTS "voucherId" TEXT CONSTRAINT "Pembayaran_voucherId_fkey" REFERENCES "Voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Pembayaran" ADD COLUMN IF NOT EXISTS "potongan" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "Pembayaran_voucherId_idx" ON "Pembayaran"("voucherId");
