import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";

// Juklak disimpan di disk server, bukan Cloudinary — akun Cloudinary gratis
// memblokir pengiriman PDF (401 "deny or ACL failure"). Di Docker, folder ini
// dipasang sebagai volume (lihat docker-compose.yml) supaya tidak hilang saat
// image di-build ulang.
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
const JUKLAK_PATH = path.join(UPLOAD_DIR, "juklak.pdf");

export async function saveJuklakFile(buffer: Buffer) {
  await mkdir(UPLOAD_DIR, { recursive: true });
  // Tulis ke file sementara dulu lalu rename, supaya pengunjung yang sedang
  // mengunduh tidak pernah mendapat file setengah jadi.
  const tmp = `${JUKLAK_PATH}.tmp`;
  await writeFile(tmp, buffer);
  await rename(tmp, JUKLAK_PATH);
}

export async function readJuklakFile() {
  try {
    return await readFile(JUKLAK_PATH);
  } catch {
    return null;
  }
}
