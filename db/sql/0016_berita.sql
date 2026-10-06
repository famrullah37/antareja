-- Berita/blog publik, dikelola Admin & Sie Humas.
-- Idempotent: aman dijalankan ulang.
CREATE TABLE IF NOT EXISTS "Berita" (
    "id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ringkasan" TEXT,
    "konten" TEXT NOT NULL,
    "coverUrl" TEXT,
    "publish" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "penulis" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Berita_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Berita_slug_key" ON "Berita"("slug");
