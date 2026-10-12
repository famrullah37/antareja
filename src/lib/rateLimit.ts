import "server-only";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

// Pembatas laju berbasis database (tabel RateLimit) — dipakai untuk action publik
// (cadangan kode unik, pembelian, daftar akun) dan percobaan login gagal.
// Satu statement INSERT … ON CONFLICT supaya hitungan tetap benar walau dua
// request datang bersamaan, dan tetap berlaku walau container restart.

async function tambah(key: string, windowMs: number): Promise<number> {
  const resetAt = new Date(Date.now() + windowMs);
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" < NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" < NOW() THEN EXCLUDED."resetAt" ELSE "RateLimit"."resetAt" END
    RETURNING "count"`;
  // Bersihkan entri kedaluwarsa sesekali supaya tabel tidak tumbuh tanpa batas.
  if (Math.random() < 0.01) {
    await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
  }
  return Number(rows[0]?.count ?? 0);
}

// IP klien di balik Traefik (Traefik mengganti X-Forwarded-For/X-Real-IP dari
// klien yang tidak dipercaya, jadi nilai ini tidak bisa dipalsukan dari luar).
export function ipKlien(): string {
  const h = headers();
  return (
    h.get("x-real-ip")?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

// Untuk server action publik: kembalikan pesan galat bila IP ini melewati batas,
// atau null bila boleh lanjut. Gagal akses DB tidak memblokir pengguna.
export async function batasiAksi(nama: string, maks: number, windowMs: number): Promise<string | null> {
  try {
    const n = await tambah(`aksi:${nama}:${ipKlien()}`, windowMs);
    if (n > maks) return "Terlalu banyak permintaan, coba lagi beberapa menit lagi";
  } catch (e) {
    console.error("rateLimit error:", e);
  }
  return null;
}

// ─── Percobaan login gagal (per email) ────────────────────────────────────────

const LOGIN_MAKS_GAGAL = 10;
const LOGIN_JENDELA_MS = 15 * 60 * 1000;
const kunciLogin = (email: string) => `login:${email.trim().toLowerCase()}`;

export async function loginDiblokir(email: string): Promise<boolean> {
  try {
    const r = await prisma.rateLimit.findUnique({ where: { key: kunciLogin(email) } });
    return !!r && r.resetAt > new Date() && r.count >= LOGIN_MAKS_GAGAL;
  } catch {
    return false;
  }
}

export async function catatLoginGagal(email: string) {
  try {
    await tambah(kunciLogin(email), LOGIN_JENDELA_MS);
  } catch (e) {
    console.error("catatLoginGagal error:", e);
  }
}

export async function resetLoginGagal(email: string) {
  await prisma.rateLimit.deleteMany({ where: { key: kunciLogin(email) } }).catch(() => {});
}
