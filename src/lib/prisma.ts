import "server-only";
import { PrismaClient } from "@prisma/client";
import { decryptDeep, encryptData, ENCRYPTED_FIELDS } from "./fieldCrypto";

function buildUrl() {
  const base = process.env.DATABASE_URL ?? "";
  // Batasi connection pool agar tidak exhausted di Neon free tier
  if (base.includes("connection_limit")) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}connection_limit=5&pool_timeout=20`;
}

const WRITE_OPS = new Set(["create", "createMany", "update", "updateMany", "upsert"]);

// Enkripsi otomatis data pribadi saat ditulis, dekripsi otomatis saat dibaca
// (lihat lib/fieldCrypto.ts). Catatan: filter `where` pada kolom terenkripsi
// tidak akan cocok — kecuali email anggota (deterministik), cari lewat kolom lain.
function createClient() {
  return new PrismaClient({ datasources: { db: { url: buildUrl() } } }).$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (model in ENCRYPTED_FIELDS && WRITE_OPS.has(operation)) {
            const a = args as Record<string, unknown>;
            if ("data" in a) a.data = encryptData(model, a.data);
            if ("create" in a) a.create = encryptData(model, a.create);
            if ("update" in a) a.update = encryptData(model, a.update);
          }
          return decryptDeep(await query(args));
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createClient>;
const globalForPrisma = globalThis as unknown as { prisma: ExtendedPrismaClient };

const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
