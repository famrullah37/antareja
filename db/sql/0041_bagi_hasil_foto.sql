-- Bagi hasil penjualan foto premium antara fotografer & panitia.
-- Idempotent: aman dijalankan ulang.
-- Fotografer pemilik album (akun role FOTOGRAFER). Tanpa FK supaya file ini
-- tetap idempotent; hapus user mengosongkan kolom ini (deleteUserForm).
ALTER TABLE "Album" ADD COLUMN IF NOT EXISTS "fotograferId" TEXT;
CREATE INDEX IF NOT EXISTS "Album_fotograferId_idx" ON "Album"("fotograferId");
-- Persentase bagian fotografer dari harga jual (tanpa kode unik); sisanya panitia.
ALTER TABLE "KonfigUmum" ADD COLUMN IF NOT EXISTS "persenFotografer" INTEGER NOT NULL DEFAULT 0;
-- Snapshot saat beli: harga tiap album yang dibeli [{albumId, nama, harga}].
ALTER TABLE "TransaksiFoto" ADD COLUMN IF NOT EXISTS "rincianAlbum" JSONB;
-- Snapshot persentase saat diverifikasi, supaya perubahan persentase tidak
-- mengubah bagi hasil transaksi lama.
ALTER TABLE "TransaksiFoto" ADD COLUMN IF NOT EXISTS "persenFotografer" INTEGER;
-- Penarikan (withdraw) saldo bagi hasil oleh fotografer. Saldo = total bagian
-- fotografer dari transaksi VERIFIED dikurangi penarikan PENDING/DIBAYAR.
CREATE TABLE IF NOT EXISTS "PenarikanFotografer" (
    "id" TEXT NOT NULL,
    "fotograferId" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "bankNama" TEXT NOT NULL,
    "bankNoRek" TEXT NOT NULL,
    "bankAtasNama" TEXT NOT NULL,
    "catatan" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "catatanAdmin" TEXT,
    "buktiTransfer" TEXT,
    "kasId" TEXT,
    "diprosesOleh" TEXT,
    "diprosesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PenarikanFotografer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PenarikanFotografer_fotograferId_idx" ON "PenarikanFotografer"("fotograferId");
-- Biaya admin transfer per penarikan (dipotong dari jumlah yang ditarik):
-- saldo berkurang sebesar jumlah, fotografer menerima jumlah − biayaAdmin.
ALTER TABLE "KonfigUmum" ADD COLUMN IF NOT EXISTS "biayaAdminPenarikan" INTEGER NOT NULL DEFAULT 2500;
ALTER TABLE "PenarikanFotografer" ADD COLUMN IF NOT EXISTS "biayaAdmin" INTEGER NOT NULL DEFAULT 0;
