// Menerapkan file SQL di db/sql/ yang belum pernah dijalankan ke database.
// Dipanggil otomatis tiap container start (lihat CMD di Dockerfile), sebelum
// server jalan — jadi perubahan skema ikut ter-deploy tanpa langkah manual.
//
// Aturan file di db/sql/:
//   - nama urut: 0002_nama_perubahan.sql (diurutkan alfabetis)
//   - IDEMPOTENT (IF NOT EXISTS, dst) — riwayat migrasi Prisma tidak dipakai
//     untuk deploy, jadi kondisi tiap database bisa beda
//   - hanya statement sederhana yang diakhiri ";" di akhir baris (tanpa DO $$ /
//     function yang mengandung ";" di dalamnya)
//   - tiap file berjalan dalam satu transaksi & dicatat di tabel _sql_migrations
//
// Opsi: --dry-run hanya menampilkan file yang akan diterapkan.
import pkg from "@prisma/client";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { PrismaClient } = pkg;
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "sql");
const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

function toStatements(sql) {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  const [{ t }] = await prisma.$queryRaw`SELECT to_regclass('_sql_migrations')::text AS t`;
  const applied = new Set(
    t ? (await prisma.$queryRaw`SELECT name FROM _sql_migrations`).map((r) => r.name) : []
  );
  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log("[migrate-sql] Database sudah up-to-date.");
    return;
  }
  console.log(`[migrate-sql] Menunggu diterapkan: ${pending.join(", ")}`);
  if (dryRun) return;

  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS _sql_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`
  );

  for (const file of pending) {
    const statements = toStatements(await readFile(path.join(dir, file), "utf8"));
    await prisma.$transaction(
      async (tx) => {
        // Kunci advisory supaya dua proses yang start bersamaan tidak berebut.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(727274)::text`;
        for (const statement of statements) await tx.$executeRawUnsafe(statement);
        await tx.$executeRaw`INSERT INTO _sql_migrations (name) VALUES (${file}) ON CONFLICT DO NOTHING`;
      },
      { timeout: 60000 }
    );
    console.log(`[migrate-sql] Diterapkan: ${file}`);
  }
}

main()
  .catch((e) => {
    // Jangan menjatuhkan container hanya karena migrasi gagal — server tetap
    // dijalankan oleh CMD, tapi errornya harus terlihat jelas di `docker logs`.
    console.error("[migrate-sql] GAGAL menerapkan migrasi:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
