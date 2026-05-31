export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import AutoDownload from "./AutoDownload";

function toDownloadUrl(url: string) {
  return url.replace("/upload/", "/upload/fl_attachment/");
}

export default async function DownloadPage({ params }: { params: { id: string } }) {
  const transaksi = await prisma.transaksiFoto.findUnique({
    where: { id: params.id },
  });

  if (!transaksi) return notFound();

  const fotoIds = transaksi.fotoList as string[];
  const fotos =
    transaksi.status === "VERIFIED"
      ? await prisma.foto.findMany({
          where: { id: { in: fotoIds } },
          select: { id: true, pathAsli: true, tagTim: true },
        })
      : [];

  const downloadUrls = fotos.map((f) => toDownloadUrl(f.pathAsli));

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-2xl mx-auto px-4 py-14 flex flex-col gap-8">

        {/* Header */}
        <div className="text-center flex flex-col gap-2">
          <div className="text-4xl">
            {transaksi.status === "VERIFIED" ? "✅" : transaksi.status === "REJECTED" ? "❌" : "⏳"}
          </div>
          <h1 className="text-2xl font-bold text-neutral-800">
            {transaksi.status === "VERIFIED"
              ? "Foto Siap Diunduh"
              : transaksi.status === "REJECTED"
              ? "Pembayaran Ditolak"
              : "Menunggu Verifikasi"}
          </h1>
          {transaksi.namaPembeli && (
            <p className="text-gray-500 text-sm">Halo, <span className="font-medium">{transaksi.namaPembeli}</span></p>
          )}
        </div>

        {/* PENDING */}
        {transaksi.status === "PENDING" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center flex flex-col gap-2">
            <p className="text-yellow-800 font-semibold">Pembayaran sedang diverifikasi</p>
            <p className="text-yellow-700 text-sm">
              Admin sedang memeriksa bukti transfer Anda. Halaman ini akan menampilkan link unduhan setelah disetujui.
            </p>
            <p className="text-yellow-600 text-xs mt-1">Simpan URL halaman ini dan kunjungi kembali dalam beberapa saat.</p>
          </div>
        )}

        {/* REJECTED */}
        {transaksi.status === "REJECTED" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center flex flex-col gap-2">
            <p className="text-red-800 font-semibold">Pembayaran tidak dapat diverifikasi</p>
            <p className="text-red-700 text-sm">
              Bukti transfer tidak dapat diverifikasi. Hubungi panitia untuk informasi lebih lanjut.
            </p>
          </div>
        )}

        {/* VERIFIED */}
        {transaksi.status === "VERIFIED" && fotos.length > 0 && (
          <>
            {/* Auto-trigger downloads */}
            <AutoDownload urls={downloadUrls} />

            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center text-sm text-green-800">
              <p className="font-semibold">Download otomatis dimulai...</p>
              <p className="text-green-700 text-xs mt-1">
                Jika tidak dimulai, klik tombol Download pada masing-masing foto di bawah.
              </p>
            </div>

            {/* Grid foto + download buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {fotos.map((foto, idx) => (
                <div key={foto.id} className="flex flex-col gap-2 bg-white rounded-xl border border-neutral-200 overflow-hidden">
                  <div className="relative aspect-square bg-neutral-100">
                    <Image
                      src={foto.pathAsli}
                      alt={foto.tagTim ?? `Foto ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 33vw"
                      unoptimized
                    />
                  </div>
                  <div className="px-3 pb-3 flex flex-col gap-1">
                    {foto.tagTim && (
                      <p className="text-xs text-gray-500 truncate">{foto.tagTim}</p>
                    )}
                    <a
                      href={toDownloadUrl(foto.pathAsli)}
                      download
                      className="text-center bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
                    >
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {transaksi.expiredAt && (
              <p className="text-center text-xs text-gray-400">
                Link aktif hingga{" "}
                {new Date(transaksi.expiredAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
