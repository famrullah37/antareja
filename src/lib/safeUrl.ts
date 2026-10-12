// URL dari input pengguna yang nanti dirender sebagai <a href> HARUS http(s).
// `new URL()` saja menerima "javascript:alert(1)" — tautan seperti itu yang
// diklik admin di panel = XSS dengan sesi admin.
export function isHttpUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
