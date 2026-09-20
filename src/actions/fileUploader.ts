'use server';

import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse } from 'cloudinary';
import sharp from 'sharp';

type ValidateOptions = { maxMB?: number; allowPdf?: boolean };
type ValidateResult = { valid: true } | { valid: false; message: string };

// Cek ukuran & tipe file SEBELUM di-buffer ke memori (arrayBuffer()) — mencegah
// klien membanjiri server dengan file raksasa yang langsung dimuat penuh ke RAM
// sebelum ada validasi apa pun.
export async function validateUploadFile(
  file: File | null | undefined,
  opts: ValidateOptions = {}
): Promise<ValidateResult> {
  const { maxMB = 10, allowPdf = false } = opts;
  if (!file || file.size === 0) return { valid: false, message: "File tidak ditemukan" };
  if (file.size > maxMB * 1024 * 1024) {
    return { valid: false, message: `Ukuran file maksimal ${maxMB}MB` };
  }
  // type kosong berarti browser tidak bisa deteksi MIME (jarang) — biarkan lolos,
  // Cloudinary tetap akan menolak format yang benar-benar tidak didukung.
  if (file.type) {
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !(allowPdf && isPdf)) {
      return {
        valid: false,
        message: allowPdf ? "File harus berupa gambar atau PDF" : "File harus berupa gambar",
      };
    }
  }
  return { valid: true };
}

// Foto profil (anggota/tim) sering langsung dari kamera HP, bisa 5-10MB.
// Upload sebesar itu apa adanya ke Cloudinary lewat server bikin request lama
// (double hop: klien->server, server->Cloudinary) dan gampang timeout di
// koneksi lambat, sampai memicu error.tsx. Kompres dulu ke ukuran wajar untuk
// foto profil sebelum diupload — dipanggil eksplisit di pemanggil (bukan di
// dalam imageUploader) karena fungsi itu juga dipakai untuk upload non-foto
// (PDF kuitansi, juklak, dll) yang tidak bisa diproses sharp.
export async function compressPhoto(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .rotate()
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch (e) {
    console.error('Gagal kompres foto, pakai file asli:', e);
    return buffer;
  }
}

export async function imageUploader(file: Buffer) {
  cloudinary.config({
    secure: true,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  try {
    const upload: UploadApiResponse = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'antareja' },
        (error, result) => {
          if (error || !result) {
            return reject(error || new Error('Cloudinary upload failed.'));
          }
          resolve(result);
        }
      );
      stream.end(file);
    });

    return {
      error: false,
      message: 'Upload sukses',
      data: { format: upload.format, url: upload.secure_url },
    };
  } catch (e: any) {
    const msg = e?.message || e?.error?.message || 'Terjadi kesalahan';
    console.error('Upload error:', msg);
    return {
      error: true,
      message: msg.includes('not allowed') ? msg : 'Terjadi kesalahan',
    };
  }
}
