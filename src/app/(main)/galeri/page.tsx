export const dynamic = "force-dynamic";

import { findAlbums, findFotos } from "@/queries/galeri.query";
import { findKonfigTiket } from "@/queries/tiket.query";
import { siteConfig } from "@/config/site";
import GaleriClient from "./GaleriClient";
import prisma from "@/lib/prisma";
import InfoHalaman from "../components/InfoHalaman";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Galeri Foto LPKBB Antareja 2026 | Lomba Paskibra SMK Telkom Malang" },
  description:
    "Galeri foto resmi LPKBB Antareja 2026 di SMK Telkom Malang: dokumentasi aksi tim paskibra peserta. Foto gratis bisa langsung diunduh, foto premium resolusi penuh.",
};

export default async function GaleriPage({ searchParams }: { searchParams?: { tim?: string } }) {
  const [albums, fotos, konfig] = await Promise.all([
    findAlbums({ statusPublish: true }),
    // Album juga harus dipublish — foto otomatis berstatus publish saat upload,
    // jadi tanpa ini foto dari album Draft ikut tampil (sama dengan cek di beliFoto).
    findFotos({ statusPublish: true, album: { statusPublish: true } }),
    findKonfigTiket(),
  ]);
  // Daftar tim yang punya foto — untuk pencarian galeri per tim (/galeri?tim=<id>).
  const timIds = Array.from(
    new Set([...fotos.map((f) => f.timId), ...albums.map((a) => a.timId)].filter((id): id is string => !!id))
  );
  const tims = timIds.length
    ? (
        await prisma.tim.findMany({
          where: { id: { in: timIds } },
          select: { id: true, nama_tim: true, asal_sekolah: true },
          orderBy: { nama_tim: "asc" },
        })
      ).map((t) => ({ id: t.id, nama: t.nama_tim, sekolah: t.asal_sekolah }))
    : [];
  const timAwal = tims.some((t) => t.id === searchParams?.tim) ? searchParams!.tim! : "";

  // URL resolusi penuh (pathAsli) foto BERBAYAR tidak boleh ikut ke browser —
  // props komponen klien terbaca di page source, jadi foto bisa diunduh tanpa
  // membeli. Untuk album berbayar klien hanya menerima versi watermark; file asli
  // dibuka lewat /galeri/download/[id] setelah pembayaran diverifikasi.
  const fotosAman = fotos.map((f) => ({
    ...f,
    pathAsli: f.album.tipe === "GRATIS" ? f.pathAsli : "",
  }));

  const totalFoto = fotos.length;
  const totalAlbum = albums.length;
  const fotoGratis = fotos.filter((f) => f.album.tipe === "GRATIS").length;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-primary-500 text-white px-6 py-14 lg:py-20">
        <div className="max-w-5xl mx-auto flex flex-col gap-4">
          <div className="text-xs font-semibold tracking-widest uppercase opacity-70">
            LPKBB Antareja 2026 — SMK Telkom Malang
          </div>
          <h1 className="text-3xl lg:text-5xl font-bold leading-tight">
            Galeri Foto
          </h1>
          <p className="text-white/80 max-w-xl text-sm lg:text-base">
            Dokumentasi lengkap LPKBB Antareja 2026. Foto gratis dapat diunduh
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
          fotos={fotosAman as any}
          konfig={konfig}
          tims={tims}
          timAwal={timAwal}
        />
      </div>

      <InfoHalaman path="/galeri" label="Galeri Foto" judul="Tentang Galeri Foto LPKBB Antareja">
        <p>
          Galeri ini berisi dokumentasi resmi LPKBB Antareja 2026, lomba keterampilan baris-berbaris (PBB) dan
          paskibra yang diselenggarakan {siteConfig.organizer}. Foto dikelompokkan per album, mulai dari aksi tim
          peserta di lapangan hingga momen di sekitar acara.
        </p>
        <p>
          Foto di album gratis dapat diunduh langsung. Foto di album premium ditampilkan dengan watermark; versi
          resolusi penuh tanpa watermark bisa dibeli dan diunduh setelah pembayaran diverifikasi panitia. Cari foto
          tim sekolahmu lewat kolom pencarian nama tim atau sekolah, atau dengan memilih album yang sesuai.
        </p>
      </InfoHalaman>
    </div>
  );
}
