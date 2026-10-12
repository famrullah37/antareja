// Validasi data pemesan untuk form publik (tiket, voting, merchandise, foto) —
// dipakai di server action, karena atribut required/type di form bisa dilewati.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cekDataPemesan(
  d: { nama?: string | null; email?: string | null; noHp?: string | null },
  opsi: { emailWajib?: boolean; noHpWajib?: boolean } = {}
): string | null {
  const { emailWajib = true, noHpWajib = true } = opsi;
  const nama = (d.nama ?? "").trim();
  const email = (d.email ?? "").trim();
  const noHp = (d.noHp ?? "").trim();
  if (!nama || nama.length > 100) return "Nama wajib diisi (maks. 100 karakter)";
  if ((emailWajib || email) && (!EMAIL_RE.test(email) || email.length > 254)) return "Email tidak valid";
  if ((noHpWajib || noHp) && !/^\+?[0-9\s-]{8,20}$/.test(noHp)) return "Nomor HP tidak valid";
  return null;
}
