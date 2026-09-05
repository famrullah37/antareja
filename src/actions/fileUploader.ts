'use server';

import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse } from 'cloudinary';

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
