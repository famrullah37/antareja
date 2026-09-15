-- Kategori dukungan tambahan (mis. Pelatih Terbaik, Danton Terbaik), di luar
-- "Tim Favorit" bawaan yang tetap dihitung lewat Tim.totalVote.

ALTER TABLE "KonfigVoting" ADD COLUMN "kategoriList" JSONB;

ALTER TABLE "TransaksiVoting" ADD COLUMN "kategori" TEXT NOT NULL DEFAULT 'tim_favorit';

CREATE TABLE "VotingTally" (
    "id" TEXT NOT NULL,
    "timId" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VotingTally_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VotingTally_timId_kategori_key" ON "VotingTally"("timId", "kategori");

ALTER TABLE "VotingTally" ADD CONSTRAINT "VotingTally_timId_fkey" FOREIGN KEY ("timId") REFERENCES "Tim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
