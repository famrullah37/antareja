-- CreateTable
CREATE TABLE "Juri" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "no_hp" TEXT NOT NULL,
    "foto" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,

    CONSTRAINT "Juri_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Juri_email_key" ON "Juri"("email");
