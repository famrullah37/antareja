// Diisi saat build lewat next.config.mjs (env), jadi ikut tertanam di bundle
// klien. Dipakai untuk memastikan deploy manual di VPS sudah memuat commit
// terbaru: bandingkan kode commit di sidebar admin dengan `git log` di GitHub.
const versi = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
const commit = process.env.NEXT_PUBLIC_APP_COMMIT ?? "dev";
const waktuBuild = process.env.NEXT_PUBLIC_APP_BUILD_TIME;

export const labelVersi = `v${versi} · ${commit}`;
// Untuk halaman publik — pengunjung cukup lihat nomor versi, tanpa kode commit.
export const labelVersiPublik = `v${versi}`;

// Diformat manual (bukan toLocaleString) supaya hasil render server & browser
// identik — beda data ICU Node vs browser bisa memicu hydration mismatch.
function formatWIB(iso: string) {
  const d = new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000);
  const dua = (n: number) => String(n).padStart(2, "0");
  return `${dua(d.getUTCDate())}/${dua(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${dua(d.getUTCHours())}:${dua(d.getUTCMinutes())} WIB`;
}

export const labelWaktuBuild = waktuBuild ? formatWIB(waktuBuild) : "";
