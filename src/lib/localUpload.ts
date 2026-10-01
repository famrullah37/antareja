import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";

// File yang diupload admin untuk diunduh publik/peserta (Juklak, surat
// undangan & rekomendasi) disimpan di disk server, bukan Cloudinary — akun
// Cloudinary gratis memblokir pengiriman PDF (401 "deny or ACL failure").
// Di Docker, folder ini dipasang sebagai volume (lihat docker-compose.yml)
// supaya tidak hilang saat image di-build ulang.
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

// Nama file selalu ditentukan kode (bukan dari input pengguna), tapi tetap
// dibatasi ke nama polos supaya tidak bisa keluar dari UPLOAD_DIR.
function uploadPath(name: string) {
  if (!/^[a-zA-Z0-9_-]+\.[a-z0-9]+$/.test(name)) throw new Error(`Nama file tidak valid: ${name}`);
  return path.join(UPLOAD_DIR, name);
}

export async function saveUploadFile(name: string, buffer: Buffer) {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const target = uploadPath(name);
  // Tulis ke file sementara dulu lalu rename, supaya pengunjung yang sedang
  // mengunduh tidak pernah mendapat file setengah jadi.
  const tmp = `${target}.tmp`;
  await writeFile(tmp, buffer);
  await rename(tmp, target);
}

export async function readUploadFile(name: string) {
  try {
    return await readFile(uploadPath(name));
  } catch {
    return null;
  }
}
