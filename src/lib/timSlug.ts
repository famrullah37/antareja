// URL admin tim yang rapi: /admin/tim/moklet-50235392 (nama tim + 8 karakter awal id)
// menggantikan UUID panjang. Tanpa perubahan skema — id tetap UUID di database,
// slug hanya dipetakan balik lewat findTimByParam (queries/tim.query.ts).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID_RE.test(value);
}

export function timSlug(tim: { id: string; nama_tim: string }) {
  const base = tim.nama_tim
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return `${base || "tim"}-${tim.id.slice(0, 8).toLowerCase()}`;
}

export function shortIdFromSlug(param: string): string | null {
  const last = param.split("-").pop() ?? "";
  return /^[0-9a-f]{8}$/i.test(last) ? last.toLowerCase() : null;
}
