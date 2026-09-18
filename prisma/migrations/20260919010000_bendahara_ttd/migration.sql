-- Nama & scan tanda tangan bendahara, ditampilkan di kuitansi PDF.
ALTER TABLE "KonfigUmum" ADD COLUMN "bendaharaNama" TEXT;
ALTER TABLE "KonfigUmum" ADD COLUMN "bendaharaTtdUrl" TEXT;
