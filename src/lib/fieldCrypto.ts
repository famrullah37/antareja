import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "crypto";

// Enkripsi per kolom untuk data pribadi (no. HP, NISN, email anggota, no.
// pelatih) dengan AES-256-GCM. Database hanya berisi teks "enc:v1:...", jadi
// dump/akses langsung ke database tidak membaca data aslinya; aplikasi
// (termasuk export Excel) tetap melihat data asli karena didekripsi otomatis
// di Prisma client (lib/prisma.ts).
//
// PENTING: format & algoritma di sini harus sama persis dengan
// scripts/encrypt-data.mjs (yang mengenkripsi data lama saat container start).
//
// Kunci: DATA_ENCRYPTION_KEY = 32 byte dalam base64 (buat dengan
// `openssl rand -base64 32`). Kalau kunci hilang, data terenkripsi TIDAK bisa
// dikembalikan — simpan cadangannya di luar server.

const PREFIX = "enc:v1:";
let warned = false;

function getKey() {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("DATA_ENCRYPTION_KEY harus 32 byte (base64)");
  return key;
}

export function isEncrypted(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(PREFIX);
}

// deterministic: nilai sama selalu menghasilkan teks terenkripsi yang sama,
// supaya constraint @unique (mis. email anggota) tetap berlaku. Hanya
// membocorkan "dua nilai ini sama", bukan isinya.
export function encryptField(value: string, deterministic = false): string {
  if (isEncrypted(value)) return value;
  const key = getKey();
  if (!key) {
    if (!warned) {
      console.warn("DATA_ENCRYPTION_KEY belum di-set — data pribadi disimpan TANPA enkripsi.");
      warned = true;
    }
    return value;
  }
  const iv = deterministic
    ? createHmac("sha256", key).update("iv:" + value).digest().subarray(0, 12)
    : randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptField(value: string): string {
  if (!isEncrypted(value)) return value;
  const key = getKey();
  if (!key) {
    console.error("Data terenkripsi ditemukan tapi DATA_ENCRYPTION_KEY tidak di-set.");
    return value;
  }
  const buf = Buffer.from(value.slice(PREFIX.length), "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

// Kolom terenkripsi per model Prisma. true = deterministik.
export const ENCRYPTED_FIELDS: Record<string, Record<string, boolean>> = {
  Anggota: { telp: false, nisn: false, email: true },
  Tim: { no_pelatih: false },
};

// Enkripsi kolom terdaftar pada objek `data` sebuah write Prisma.
export function encryptData(model: string, data: unknown): unknown {
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields || !data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map((d) => encryptData(model, d));
  const out: Record<string, unknown> = { ...(data as Record<string, unknown>) };
  for (const [field, deterministic] of Object.entries(fields)) {
    const v = out[field];
    if (typeof v === "string" && v !== "") out[field] = encryptField(v, deterministic);
    else if (v && typeof v === "object" && typeof (v as { set?: unknown }).set === "string") {
      out[field] = { set: encryptField((v as { set: string }).set, deterministic) };
    }
  }
  return out;
}

// Dekripsi semua string "enc:v1:" di hasil query, termasuk relasi (include).
export function decryptDeep<T>(value: T): T {
  if (isEncrypted(value)) return decryptField(value) as T;
  if (Array.isArray(value)) return value.map(decryptDeep) as T;
  if (value && typeof value === "object" && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return value; // Decimal, dll.
    for (const k of Object.keys(value)) {
      (value as Record<string, unknown>)[k] = decryptDeep((value as Record<string, unknown>)[k]);
    }
  }
  return value;
}
