-- Pengajuan menginap: tim (dashboard) mengajukan menginap dengan jumlah putra/
-- putri/pendamping & tanggal datang–pulang, panitia menyetujui/menolak di
-- /admin/menginap. Unique timId = satu tim satu pengajuan. KonfigUmum.menginapAktif
-- membuka/menutup form, menginapInfo = keterangan dari panitia.
-- Idempotent: aman dijalankan ulang.
CREATE TABLE IF NOT EXISTS "PengajuanMenginap" (
    "id" TEXT NOT NULL,
    "timId" TEXT NOT NULL,
    "jumlahPutra" INTEGER NOT NULL DEFAULT 0,
    "jumlahPutri" INTEGER NOT NULL DEFAULT 0,
    "jumlahPendamping" INTEGER NOT NULL DEFAULT 0,
    "tanggalDatang" DATE NOT NULL,
    "tanggalPulang" DATE NOT NULL,
    "namaPj" TEXT NOT NULL,
    "noHpPj" TEXT NOT NULL,
    "catatan" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "catatanAdmin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PengajuanMenginap_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PengajuanMenginap_timId_fkey" FOREIGN KEY ("timId") REFERENCES "Tim"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "PengajuanMenginap_timId_key" ON "PengajuanMenginap"("timId");
ALTER TABLE "KonfigUmum" ADD COLUMN IF NOT EXISTS "menginapAktif" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "KonfigUmum" ADD COLUMN IF NOT EXISTS "menginapInfo" TEXT;
