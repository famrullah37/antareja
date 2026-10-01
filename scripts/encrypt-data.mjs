// Mengenkripsi data pribadi lama (yang masih teks biasa) di database.
// Dipanggil otomatis tiap container start (lihat CMD di Dockerfile), setelah
// migrate-sql. Idempotent: nilai yang sudah "enc:v1:..." dilewati, jadi aman
// dijalankan berulang. Tanpa DATA_ENCRYPTION_KEY, script ini tidak melakukan apa-apa.
//
// PENTING: algoritma & format harus sama persis dengan src/lib/fieldCrypto.ts.
//
// Opsi: --dry-run hanya menghitung baris yang akan dienkripsi.
import pkg from "@prisma/client";
import { createCipheriv, createHmac, randomBytes } from "node:crypto";

const { PrismaClient } = pkg;
const PREFIX = "enc:v1:";
const dryRun = process.argv.includes("--dry-run");

// model Prisma -> { kolom: deterministik? } (sama dengan ENCRYPTED_FIELDS)
const FIELDS = {
  anggota: { telp: false, nisn: false, email: true },
  tim: { no_pelatih: false },
};

function encrypt(key, value, deterministic) {
  const iv = deterministic
    ? createHmac("sha256", key).update("iv:" + value).digest().subarray(0, 12)
    : randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

async function main() {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw) {
    console.log("[encrypt-data] DATA_ENCRYPTION_KEY belum di-set, dilewati.");
    return;
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("DATA_ENCRYPTION_KEY harus 32 byte (base64)");

  const prisma = new PrismaClient();
  try {
    for (const [model, fields] of Object.entries(FIELDS)) {
      const select = { id: true, ...Object.fromEntries(Object.keys(fields).map((f) => [f, true])) };
      const rows = await prisma[model].findMany({ select });
      let count = 0;
      for (const row of rows) {
        const data = {};
        for (const [field, deterministic] of Object.entries(fields)) {
          const v = row[field];
          if (typeof v === "string" && v !== "" && !v.startsWith(PREFIX)) {
            data[field] = encrypt(key, v, deterministic);
          }
        }
        if (Object.keys(data).length === 0) continue;
        count++;
        if (!dryRun) await prisma[model].update({ where: { id: row.id }, data });
      }
      console.log(`[encrypt-data] ${model}: ${count} baris ${dryRun ? "akan" : "sudah"} dienkripsi.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("[encrypt-data] Gagal:", e);
  process.exitCode = 1;
});
