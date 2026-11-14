// Rekap suara voting per tim (per kategori) → CSV.
// Pakai DATABASE_URL dari environment. Jalankan di VPS (DB prod):
//   node scripts/rekap-voting.mjs > rekap-voting.csv
// Kolom:
//   suara_masuk     = jumlah vote dari transaksi VERIFIED (terhitung resmi)
//   suara_pending   = jumlah vote dari transaksi yang belum diverifikasi
//   total_tercatat  = Tim.totalVote (tim_favorit) / VotingTally.total (kategori lain)
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const rows = await prisma.$queryRaw`
  SELECT t.jenjang::text AS jenjang, t."noUrut" AS no_urut, t.nama_tim, t.asal_sekolah,
         k.kategori,
         COALESCE(SUM(tv."jumlahVote") FILTER (WHERE tv.status = 'VERIFIED'), 0)::int AS suara_masuk,
         COALESCE(SUM(tv."jumlahVote") FILTER (WHERE tv.status = 'PENDING'), 0)::int AS suara_pending,
         COUNT(tv.id) FILTER (WHERE tv.status = 'VERIFIED')::int AS jml_transaksi_verified,
         COALESCE(SUM(tv."totalBayar") FILTER (WHERE tv.status = 'VERIFIED'), 0)::int AS total_rupiah_verified,
         CASE WHEN k.kategori = 'tim_favorit' THEN t."totalVote"
              ELSE COALESCE(vt.total, 0) END AS total_tercatat
  FROM "Tim" t
  CROSS JOIN (
    SELECT 'tim_favorit' AS kategori
    UNION SELECT DISTINCT kategori FROM "TransaksiVoting"
    UNION SELECT DISTINCT kategori FROM "VotingTally"
  ) k
  LEFT JOIN "TransaksiVoting" tv ON tv."timId" = t.id AND tv.kategori = k.kategori
  LEFT JOIN "VotingTally" vt ON vt."timId" = t.id AND vt.kategori = k.kategori
  WHERE t."gugurTanpaVote" = false
  GROUP BY t.id, k.kategori, vt.total
  HAVING k.kategori = 'tim_favorit' OR COUNT(tv.id) > 0 OR COALESCE(vt.total, 0) > 0
  ORDER BY k.kategori, suara_masuk DESC, t.jenjang, t."noUrut"
`;

const cols = ["jenjang", "no_urut", "nama_tim", "asal_sekolah", "kategori", "suara_masuk",
  "suara_pending", "jml_transaksi_verified", "total_rupiah_verified", "total_tercatat"];
const esc = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
console.log(cols.join(","));
for (const r of rows) console.log(cols.map((c) => esc(r[c])).join(","));

await prisma.$disconnect();
