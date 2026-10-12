-- Penjualan merchandise sistem pre-order (PO): master produk, konfigurasi
-- periode PO, dan pesanan. Idempotent: aman dijalankan ulang.
CREATE TABLE IF NOT EXISTS "Merchandise" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "harga" INTEGER NOT NULL,
    "fotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ukuran" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Merchandise_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "KonfigMerch" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "poAktif" BOOLEAN NOT NULL DEFAULT false,
    "tutupPada" TIMESTAMP(3),
    "infoPengambilan" TEXT,
    "counterUrut" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "KonfigMerch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PesananMerch" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "noHp" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "kodeUnik" TEXT NOT NULL,
    "totalBayar" INTEGER NOT NULL,
    "metodePembayaran" TEXT NOT NULL DEFAULT 'TRANSFER',
    "bukti" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "catatanAdmin" TEXT,
    "diambilAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PesananMerch_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PesananMerch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
