// Batas percobaan login gagal per email, supaya password tidak bisa ditebak
// terus-menerus. Disimpan di memori proses — cukup karena aplikasi berjalan
// sebagai satu container; hitungan ter-reset kalau container restart.
const MAX_GAGAL = 10;
const JENDELA_MS = 15 * 60 * 1000;

const gagal = new Map<string, { count: number; resetAt: number }>();

function kunci(email: string) {
  return email.trim().toLowerCase();
}

export function loginDiblokir(email: string) {
  const entry = gagal.get(kunci(email));
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    gagal.delete(kunci(email));
    return false;
  }
  return entry.count >= MAX_GAGAL;
}

export function catatLoginGagal(email: string) {
  const k = kunci(email);
  const now = Date.now();
  const entry = gagal.get(k);
  if (!entry || now > entry.resetAt) gagal.set(k, { count: 1, resetAt: now + JENDELA_MS });
  else entry.count++;

  // Bersihkan entri kedaluwarsa sesekali supaya Map tidak tumbuh tanpa batas.
  if (gagal.size > 5000) {
    for (const [key, e] of gagal) if (now > e.resetAt) gagal.delete(key);
  }
}

export function resetLoginGagal(email: string) {
  gagal.delete(kunci(email));
}
