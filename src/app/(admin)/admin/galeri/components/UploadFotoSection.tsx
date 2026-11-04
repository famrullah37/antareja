"use client";

import { uploadFoto } from "@/actions/Galeri";
import { useState } from "react";
import { toast } from "sonner";

type Album = { id: string; nama: string; timId: string | null };
type Fotografer = { id: string; nama: string };
type TimOpsi = { id: string; nama: string; sekolah: string };

export default function UploadFotoSection({
  albums,
  fotografers,
  tims,
  isAdmin,
}: {
  albums: Album[];
  fotografers: Fotografer[];
  tims: TimOpsi[];
  isAdmin: boolean;
}) {
  const [fileCount, setFileCount] = useState(0);
  const [cariTim, setCariTim] = useState("");
  const [timId, setTimId] = useState("");
  const [albumId, setAlbumId] = useState("");
  // Album yang sudah terhubung ke tim: semua fotonya otomatis milik tim itu.
  const albumTimId = albums.find((a) => a.id === albumId)?.timId ?? null;
  const timAlbum = albumTimId ? tims.find((t) => t.id === albumTimId) ?? null : null;
  // Tim terpilih tetap ada di daftar walau tidak cocok dengan kata pencarian.
  const q = cariTim.trim().toLowerCase();
  const timTersaring = q
    ? tims.filter((t) => t.id === timId || t.nama.toLowerCase().includes(q) || t.sekolah.toLowerCase().includes(q))
    : tims;

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
      if (result.failedReasons?.length) {
        toast.error(`Alasan gagal: ${result.failedReasons.join("; ")}`, { duration: 8000 });
      }
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
            value={albumId}
            onChange={(e) => setAlbumId(e.target.value)}
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">-- Pilih Album --</option>
            {albums.map((a) => {
              const t = a.timId ? tims.find((x) => x.id === a.timId) : null;
              return (
                <option key={a.id} value={a.id}>
                  {a.nama}
                  {t ? ` (tim ${t.nama})` : ""}
                </option>
              );
            })}
          </select>
        </div>

        {isAdmin ? (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Fotografer foto ini</label>
            <select name="fotograferId" defaultValue="" className="border border-neutral-300 rounded-lg px-3 py-2 text-sm">
              <option value="">— Ikut fotografer album —</option>
              {fotografers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nama}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">Satu album/tim boleh berisi foto dari beberapa fotografer — bagi hasil dihitung per foto.</p>
          </div>
        ) : (
          <p className="text-xs text-gray-500">Foto yang Anda upload tercatat atas nama Anda untuk bagi hasil penjualan.</p>
        )}

        {timAlbum ? (
          <div className="bg-primary-50 border border-primary-200 text-primary-800 rounded-lg px-3 py-2 text-sm">
            Album ini milik tim <b>{timAlbum.nama}</b> ({timAlbum.sekolah}) — semua foto otomatis menjadi foto tim ini.
          </div>
        ) : (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Tim di foto ini (opsional)</label>
          <input
            value={cariTim}
            onChange={(e) => setCariTim(e.target.value)}
            placeholder="Cari nama tim / sekolah..."
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          />
          <select
            name="timId"
            value={timId}
            onChange={(e) => setTimId(e.target.value)}
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">— Tanpa tim (foto umum) —</option>
            {timTersaring.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nama} — {t.sekolah}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">
            Foto akan muncul di pencarian galeri untuk tim ini dan di dashboard tim tersebut. Untuk album khusus
            satu tim, lebih praktis hubungkan albumnya ke tim di Manajemen Album.
          </p>
        </div>
        )}

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
