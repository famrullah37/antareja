'use server';

import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse } from 'cloudinary';

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
