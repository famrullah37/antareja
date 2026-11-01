-- Kuitansi manual oleh Bendahara (menu /admin/kuitansi). Nomor dari counter
-- bersama KonfigUmum.counterKuitansi. Idempotent: aman dijalankan ulang.
CREATE TABLE IF NOT EXISTS "KuitansiManual" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "diterimaDari" TEXT NOT NULL,
    "untukPembayaran" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "metode" TEXT NOT NULL,
    "catatan" TEXT,
    "kasId" TEXT,
    "olehNama" TEXT NOT NULL,
    "batalAt" TIMESTAMP(3),
    "batalAlasan" TEXT,
    "batalOleh" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KuitansiManual_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "KuitansiManual_nomor_key" ON "KuitansiManual"("nomor");
