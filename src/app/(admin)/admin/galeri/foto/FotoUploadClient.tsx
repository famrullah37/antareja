"use client";

import { deleteFotoAdmin, setGratisFoto } from "@/actions/Galeri";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

type Foto = {
  id: string;
  url: string;
  urlAsli: string;
  albumId: string;
  albumNama: string;
  albumTipe: string;
  gratis: boolean;
  harga: number;
  tim: string | null;
  fotografer: string | null;
  terjual: number;
  createdAt: string;
};

const PER_HALAMAN = 60;

export default function FotoUploadClient({ fotos, isAdmin, albumAwal }: { fotos: Foto[]; isAdmin: boolean; albumAwal: string }) {
  const [album, setAlbum] = useState(albumAwal);
  const [fotografer, setFotografer] = useState("");
  const [cari, setCari] = useState("");
  const [tampil, setTampil] = useState(PER_HALAMAN);
  const [pending, startTransition] = useTransition();

  const albums = useMemo(() => {
    const m = new Map<string, { nama: string; jumlah: number }>();
    for (const f of fotos) {
      const a = m.get(f.albumId) ?? { nama: f.albumNama, jumlah: 0 };
      a.jumlah++;
      m.set(f.albumId, a);
    }
    return Array.from(m, ([id, a]) => ({ id, ...a })).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [fotos]);
  const fotografers = useMemo(
    () => Array.from(new Set(fotos.map((f) => f.fotografer ?? "—"))).sort((a, b) => a.localeCompare(b)),
    [fotos]
  );

  const q = cari.trim().toLowerCase();
  const tersaring = fotos.filter(
    (f) =>
      (!album || f.albumId === album) &&
      (!fotografer || (f.fotografer ?? "—") === fotografer) &&
      (!q || (f.tim ?? "").toLowerCase().includes(q) || f.albumNama.toLowerCase().includes(q))
  );
  const totalTerjual = tersaring.reduce((s, f) => s + f.terjual, 0);
  const fotoTerjual = tersaring.filter((f) => f.terjual > 0).length;

  function ubahGratis(f: Foto) {
    startTransition(async () => {
      const r = await setGratisFoto(f.id, !f.gratis);
      if (r.success) toast.success(f.gratis ? "Foto dijadikan berbayar" : "Foto dijadikan gratis");
      else toast.error(r.message ?? "Gagal mengubah foto");
    });
  }

  function hapus(f: Foto) {
    if (!confirm("Hapus foto ini dari galeri? Tindakan ini tidak bisa dibatalkan.")) return;
    startTransition(async () => {
      const r = await deleteFotoAdmin(f.id);
      if (r.success) toast.success("Foto dihapus");
      else toast.error(r.message ?? "Gagal menghapus foto");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3 max-w-xl">
        <div className="rounded-xl border border-neutral-200 bg-white p-3">
          <div className="text-xl font-bold">{tersaring.length}</div>
          <div className="text-xs text-gray-500">Foto</div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-3">
          <div className="text-xl font-bold">{fotoTerjual}</div>
          <div className="text-xs text-gray-500">Foto pernah terjual</div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-3">
          <div className="text-xl font-bold">{totalTerjual}×</div>
          <div className="text-xs text-gray-500">Total terjual</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={album}
          onChange={(e) => {
            setAlbum(e.target.value);
            setTampil(PER_HALAMAN);
          }}
          className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Semua album ({fotos.length})</option>
          {albums.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nama} ({a.jumlah})
            </option>
          ))}
        </select>
        {isAdmin && (
          <select
            value={fotografer}
            onChange={(e) => {
              setFotografer(e.target.value);
              setTampil(PER_HALAMAN);
            }}
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Semua fotografer</option>
            {fotografers.map((n) => (
              <option key={n} value={n}>
                {n === "—" ? "Tanpa fotografer" : n}
              </option>
            ))}
          </select>
        )}
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari tim / album..."
          className="border border-neutral-300 rounded-lg px-3 py-2 text-sm w-full sm:w-56"
        />
      </div>

      {tersaring.length === 0 ? (
        <p className="text-sm text-gray-500">Belum ada foto.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {tersaring.slice(0, tampil).map((f) => (
              <div key={f.id} className="bg-white rounded-xl border border-neutral-200 overflow-hidden flex flex-col">
                <a href={f.urlAsli} target="_blank" rel="noopener noreferrer" className="relative block aspect-square bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail Cloudinary, banyak & ukuran bebas */}
                  <img src={f.url} alt={f.tim ?? f.albumNama} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                  {f.terjual > 0 && (
                    <span className="absolute top-2 left-2 bg-green-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                      Terjual {f.terjual}×
                    </span>
                  )}
                  <span
                    className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      f.gratis ? "bg-emerald-500 text-white" : "bg-black/60 text-white"
                    }`}
                  >
                    {f.gratis ? "GRATIS" : `Rp${f.harga.toLocaleString("id-ID")}`}
                  </span>
                </a>
                <div className="p-2 text-xs flex flex-col gap-0.5">
                  <p className="font-medium truncate" title={f.albumNama}>
                    {f.albumNama}
                  </p>
                  {f.tim && <p className="text-gray-500 truncate">Tim: {f.tim}</p>}
                  {isAdmin && <p className="text-gray-500 truncate">Fotografer: {f.fotografer ?? "—"}</p>}
                  <p className="text-gray-500">
                    {new Date(f.createdAt).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Jakarta",
                    })}
                  </p>
                  {f.albumTipe !== "GRATIS" && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => ubahGratis(f)}
                      className="self-start mt-1 text-emerald-700 hover:underline disabled:opacity-50"
                    >
                      {f.gratis ? "Jadikan berbayar" : "Jadikan gratis"}
                    </button>
                  )}
                  {f.terjual > 0 ? (
                    <span className="mt-1 text-gray-400" title="Foto yang sudah dibeli tidak bisa dihapus">
                      Terkunci (sudah dibeli)
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => hapus(f)}
                      className="self-start mt-1 text-red-600 hover:underline disabled:opacity-50"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {tampil < tersaring.length && (
            <button
              type="button"
              onClick={() => setTampil((t) => t + PER_HALAMAN)}
              className="self-center border border-neutral-300 rounded-lg px-4 py-2 text-sm hover:bg-neutral-50"
            >
              Tampilkan lebih banyak ({tersaring.length - tampil} lagi)
            </button>
          )}
        </>
      )}
    </div>
  );
}
