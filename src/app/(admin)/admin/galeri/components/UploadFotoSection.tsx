"use client";

import { uploadFoto } from "@/actions/Galeri";
import { useState } from "react";
import { toast } from "sonner";

type Album = { id: string; nama: string };

export default function UploadFotoSection({ albums }: { albums: Album[] }) {
  const [fileCount, setFileCount] = useState(0);

  async function handleUpload(data: FormData) {
    if (fileCount === 0) {
      toast.error("Pilih minimal 1 foto");
      return;
    }
    const toastId = toast.loading(`Mengupload ${fileCount} foto...`);
    const result = await uploadFoto(data);
    if (result.success) {
      toast.success(
        `Berhasil upload ${result.uploaded} foto${result.failed ? `, gagal: ${result.failed}` : ""}`,
        { id: toastId }
      );
    } else {
      toast.error("Gagal upload", { id: toastId });
    }
  }

  if (albums.length === 0) {
    return (
      <section>
        <h2 className="text-xl font-semibold mb-3">Upload Foto</h2>
        <p className="text-sm text-gray-400">
          Buat album terlebih dahulu sebelum upload foto.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">Upload Foto</h2>
      <form
        action={handleUpload}
        className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col gap-4 max-w-xl"
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Album Tujuan</label>
          <select
            name="albumId"
            required
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">-- Pilih Album --</option>
            {albums.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nama}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Tag Nama Tim (opsional)</label>
          <input
            name="tagTim"
            placeholder="Contoh: SMAN 1 Malang"
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            Pilih Foto{" "}
            <span className="text-gray-400 font-normal">
              (bisa pilih banyak)
            </span>
          </label>
          <input
            name="fotos"
            type="file"
            accept="image/*"
            multiple
            required
            onChange={(e) => setFileCount(e.target.files?.length ?? 0)}
            className="border border-neutral-200 py-3 px-3 rounded-xl file:bg-primary-500 file:text-white file:rounded-md file:border-none file:py-1 file:px-3 hover:cursor-pointer file:hover:bg-primary-600 file:transition-colors text-sm"
          />
          {fileCount > 0 && (
            <p className="text-xs text-primary-600">{fileCount} foto dipilih</p>
          )}
        </div>

        <button
          type="submit"
          className="bg-primary-500 text-white rounded-lg py-2 text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          Upload Foto
        </button>
      </form>
    </section>
  );
}
