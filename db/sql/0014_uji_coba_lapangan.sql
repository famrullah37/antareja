-- Pendaftaran uji coba lapangan: admin membuat sesi (mis. "Malang" 15.00–18.00),
-- sesi dipecah otomatis jadi slot (default 10 menit), lalu tiap tim yang
-- pembayarannya sudah diverifikasi memilih SATU slot sendiri dari dashboard.
-- Unique (sesiId, mulai) = satu slot satu tim (aman dari rebutan bersamaan);
-- unique timId = satu tim satu slot. KonfigUmum.ujiCobaBatas = batas waktu tim
-- boleh memilih/ganti/batal (setelahnya hanya admin).
-- Idempotent: aman dijalankan ulang.
CREATE TABLE IF NOT EXISTS "SesiUjiCoba" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "mulai" TIMESTAMP(3) NOT NULL,
    "selesai" TIMESTAMP(3) NOT NULL,
    "durasiMenit" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SesiUjiCoba_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "UjiCobaTim" (
    "id" TEXT NOT NULL,
    "timId" TEXT NOT NULL,
    "sesiId" TEXT NOT NULL,
    "mulai" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UjiCobaTim_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UjiCobaTim_timId_fkey" FOREIGN KEY ("timId") REFERENCES "Tim"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UjiCobaTim_sesiId_fkey" FOREIGN KEY ("sesiId") REFERENCES "SesiUjiCoba"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "UjiCobaTim_timId_key" ON "UjiCobaTim"("timId");
CREATE UNIQUE INDEX IF NOT EXISTS "UjiCobaTim_sesiId_mulai_key" ON "UjiCobaTim"("sesiId", "mulai");
ALTER TABLE "KonfigUmum" ADD COLUMN IF NOT EXISTS "ujiCobaBatas" TIMESTAMP(3);
