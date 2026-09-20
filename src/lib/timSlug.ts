// URL admin yang rapi: /admin/tim/moklet-50235392 (nama + 8 karakter awal id) menggantikan
// UUID panjang. Tanpa perubahan skema — id tetap UUID di database, slug hanya dipetakan
// balik lewat resolveSlugId. UUID mentah (link/bookmark lama) tetap dikenali & di-redirect.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID_RE.test(value);
}

function slugify(text: string) {
  return text
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export function makeSlug(label: string, id: string, fallback = "data") {
  // id bukan UUID (mis. data seed): pakai id apa adanya, tetap bisa dicari langsung.
  if (!isUuid(id)) return id;
  return `${slugify(label) || fallback}-${id.slice(0, 8).toLowerCase()}`;
}

export function timSlug(tim: { id: string; nama_tim: string }) {
  return makeSlug(tim.nama_tim, tim.id, "tim");
}

export function shortIdFromSlug(param: string): string | null {
  const last = param.split("-").pop() ?? "";
  return /^[0-9a-f]{8}$/i.test(last) ? last.toLowerCase() : null;
}

// UUID → dikembalikan apa adanya; slug → dicari lewat `find` (awalan id). Slug ambigu
// (dua data berawalan id sama) dianggap tidak ditemukan, bukan ditebak.
export async function resolveSlugId(
  param: string,
  find: (idPrefix: string) => Promise<{ id: string }[]>
): Promise<string | null> {
  if (isUuid(param)) return param;
  const short = shortIdFromSlug(param);
  if (!short) return param; // bukan slug: perlakukan sebagai id apa adanya (pemanggil yang memvalidasi)
  const found = await find(short);
  return found.length === 1 ? found[0].id : null;
}

// Halaman input nilai juri hanya menampilkan No. Urut (bukan nama tim), jadi URL-nya
// juga tidak boleh memuat nama tim: "sma-03" = jenjang + no. urut (unik per jenjang).
// Tim tanpa no. urut memakai "tim-<8 hex id>".
export function noUrutSlug(tim: { id: string; jenjang: string; noUrut: number | null }) {
  if (tim.noUrut != null) return `${tim.jenjang.toLowerCase()}-${String(tim.noUrut).padStart(2, "0")}`;
  return isUuid(tim.id) ? `tim-${tim.id.slice(0, 8).toLowerCase()}` : tim.id;
}

export function parseNoUrutSlug(param: string): { jenjang: string; noUrut: number } | null {
  const m = /^([a-z]+)-(\d+)$/i.exec(param);
  return m ? { jenjang: m[1].toUpperCase(), noUrut: parseInt(m[2], 10) } : null;
}
