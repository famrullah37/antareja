export const dynamic = "force-dynamic";

import { findAlbums, findFotos } from "@/queries/galeri.query";
import { findKonfigTiket } from "@/queries/tiket.query";
import { getServerSession } from "@/lib/next-auth";
import GaleriClient from "./GaleriClient";

export default async function GaleriPage() {
  const [albums, fotos, session, konfig] = await Promise.all([
    findAlbums({ statusPublish: true }),
    findFotos({ statusPublish: true }),
    getServerSession(),
    findKonfigTiket(),
  ]);

  const totalFoto = fotos.length;
  const totalAlbum = albums.length;
  const fotoGratis = fotos.filter((f) => f.album.tipe === "GRATIS").length;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-primary-500 text-white px-6 py-14 lg:py-20">
        <div className="max-w-5xl mx-auto flex flex-col gap-4">
          <div className="text-xs font-semibold tracking-widest uppercase opacity-70">
            LKBB Antareja 2026 — SMK Telkom Malang
          </div>
          <h1 className="text-3xl lg:text-5xl font-bold leading-tight">
            Galeri Foto
          </h1>
          <p className="text-white/80 max-w-xl text-sm lg:text-base">
            Dokumentasi lengkap LKBB Antareja 2026. Foto gratis dapat diunduh
            langsung; foto berbayar tersedia resolusi penuh setelah pembelian.
          </p>
          <div className="flex gap-6 mt-2">
            <div className="flex flex-col">
              <span className="text-2xl font-bold">{totalAlbum}</span>
              <span className="text-white/70 text-xs">Album</span>
            </div>
            <div className="w-px bg-white/20" />
            <div className="flex flex-col">
              <span className="text-2xl font-bold">{totalFoto}</span>
              <span className="text-white/70 text-xs">Total Foto</span>
            </div>
            <div className="w-px bg-white/20" />
            <div className="flex flex-col">
              <span className="text-2xl font-bold">{fotoGratis}</span>
              <span className="text-white/70 text-xs">Foto Gratis</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        <GaleriClient
          albums={albums as any}
          fotos={fotos as any}
          userId={session?.user?.id}
          konfig={konfig}
        />
      </div>
    </div>
  );
}
