"use client";

import { createAlbumAdmin, deleteAlbumAdmin, publishAlbum } from "@/actions/Galeri";
import { toast } from "sonner";

type Album = {
  id: string;
  nama: string;
  deskripsi: string | null;
  tipe: string;
  harga: number;
  statusPublish: boolean;
  createdAt: Date;
  _count: { fotos: number };
};

const TIPE_COLORS: Record<string, string> = {
  GRATIS: "bg-green-100 text-green-700",
  BERBAYAR: "bg-orange-100 text-orange-700",
};

export default function AlbumSection({ albums }: { albums: Album[] }) {
  async function handleCreate(data: FormData) {
    const toastId = toast.loading("Membuat album...");
    const result = await createAlbumAdmin(data);
    if (result.success) toast.success("Album dibuat!", { id: toastId });
    else toast.error("Gagal", { id: toastId });
  }

  async function handlePublish(id: string, current: boolean) {
    const toastId = toast.loading(current ? "Menyembunyikan..." : "Mempublish...");
    const result = await publishAlbum(id, !current);
    if (result.success)
      toast.success(current ? "Album disembunyikan" : "Album dipublish!", { id: toastId });
    else toast.error("Gagal", { id: toastId });
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus album beserta semua fotonya?")) return;
    const toastId = toast.loading("Menghapus...");
    const result = await deleteAlbumAdmin(id);
    if (result.success) toast.success("Album dihapus", { id: toastId });
    else toast.error("Gagal", { id: toastId });
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">Manajemen Album</h2>
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form buat album */}
        <form
          action={handleCreate}
          className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col gap-3"
        >
          <h3 className="font-medium">Buat Album Baru</h3>
          <div className="flex flex-col gap-1">
            <label className="text-sm">Nama Album</label>
            <input
              name="nama"
              required
              placeholder="Dokumentasi Hari H"
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm">Deskripsi (opsional)</label>
            <textarea
              name="deskripsi"
              placeholder="Deskripsi album..."
              rows={2}
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm">Tipe Album</label>
            <select
              name="tipe"
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="BERBAYAR">Berbayar — perlu pembelian untuk download</option>
              <option value="GRATIS">Gratis — semua bisa lihat & download</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm">Harga per Foto (Rp) — khusus album Berbayar</label>
            <input
              name="harga"
              type="number"
              min="0"
              placeholder="0"
              defaultValue="10000"
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="bg-primary-500 text-white rounded-lg py-2 text-sm font-semibold hover:bg-primary-600 transition-colors"
          >
            Buat Album
          </button>
        </form>

        {/* Daftar album */}
        <div className="flex flex-col gap-2">
          {albums.length === 0 ? (
            <p className="text-gray-400 text-sm">Belum ada album.</p>
          ) : (
            albums.map((album) => (
              <div
                key={album.id}
                className="bg-white border border-neutral-200 rounded-xl px-4 py-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{album.nama}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span>{album._count.fotos} foto</span>
                    <span>·</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${TIPE_COLORS[album.tipe] ?? "bg-neutral-100 text-neutral-600"}`}>
                      {album.tipe}
                    </span>
                    {album.tipe === "BERBAYAR" && album.harga > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-gray-500">{new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",minimumFractionDigits:0}).format(album.harga)}/foto</span>
                      </>
                    )}
                    <span>·</span>
                    {album.statusPublish ? (
                      <span className="text-green-600">Publik</span>
                    ) : (
                      <span className="text-gray-400">Draft</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handlePublish(album.id, album.statusPublish)}
                    className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                      album.statusPublish
                        ? "border-neutral-300 hover:bg-neutral-50"
                        : "border-primary-300 text-primary-600 hover:bg-primary-50"
                    }`}
                  >
                    {album.statusPublish ? "Sembunyikan" : "Publish"}
                  </button>
                  <button
                    onClick={() => handleDelete(album.id)}
                    className="text-xs px-3 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
