"use client";

import { beliFoto } from "@/actions/Galeri";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

type FotoItem = {
  id: string;
  pathWatermark: string;
  pathAsli: string;
  tagTim: string | null;
  albumId: string;
  album: { nama: string; tipe: string; harga: number };
};

type AlbumItem = {
  id: string;
  nama: string;
  tipe: string;
  harga: number;
  deskripsi: string | null;
  _count: { fotos: number };
};

type KonfigTiket = {
  bankNama?: string | null;
  bankNoRek?: string | null;
  bankAtasNama?: string | null;
} | null;

function toDownloadUrl(url: string) {
  return url.replace("/upload/", "/upload/fl_attachment/");
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

export default function GaleriClient({
  albums,
  fotos,
  userId,
  konfig,
}: {
  albums: AlbumItem[];
  fotos: FotoItem[];
  userId?: string;
  konfig: KonfigTiket;
}) {
  const [selectedAlbum, setSelectedAlbum] = useState<string>("all");
  const [cart, setCart] = useState<Set<string>>(new Set());
  const [showCheckout, setShowCheckout] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [transaksiId, setTransaksiId] = useState<string | null>(null);
  const [kodeUnik] = useState(() => String(Math.floor(Math.random() * 900) + 100));

  const filtered =
    selectedAlbum === "all"
      ? fotos
      : fotos.filter((f) => f.albumId === selectedAlbum);

  function toggleCart(id: string) {
    setCart((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Hitung total harga dari album unik yang dipilih
  const cartFotos = fotos.filter((f) => cart.has(f.id));
  const albumPriceMap = new Map(cartFotos.map((f) => [f.albumId, f.album.harga]));
  const totalHarga = Array.from(albumPriceMap.values()).reduce((s, h) => s + h, 0);

  async function handleCheckout(data: FormData) {
    data.set("fotoList", JSON.stringify(Array.from(cart)));
    const toastId = toast.loading("Memproses...");
    const result = await beliFoto(data, userId);
    if (result.success) {
      toast.success("Pembelian diterima!", { id: toastId, duration: 4000 });
      setTransaksiId(result.transaksiId ?? null);
      setSubmitted(true);
      setShowCheckout(false);
    } else {
      toast.error("Gagal memproses pembelian", { id: toastId });
    }
  }

  if (fotos.length === 0) {
    return (
      <div className="bg-neutral-50 rounded-2xl p-16 text-center">
        <div className="text-5xl mb-4">📷</div>
        <p className="text-gray-500 font-medium">Foto belum tersedia.</p>
        <p className="text-gray-400 text-sm mt-1">Pantau terus setelah acara berlangsung.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Album Tabs */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Album</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedAlbum("all")}
            className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-colors ${
              selectedAlbum === "all"
                ? "border-primary-500 bg-primary-500 text-white"
                : "border-neutral-200 hover:border-neutral-400 text-neutral-600"
            }`}
          >
            Semua Foto
            <span className="ml-1.5 opacity-70">({fotos.length})</span>
          </button>
          {albums.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedAlbum(a.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-colors flex items-center gap-2 ${
                selectedAlbum === a.id
                  ? "border-primary-500 bg-primary-500 text-white"
                  : "border-neutral-200 hover:border-neutral-400 text-neutral-600"
              }`}
            >
              {a.nama}
              <span className="opacity-70">({a._count.fotos})</span>
              {a.tipe === "GRATIS" ? (
                <span className="text-[9px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded-full">GRATIS</span>
              ) : (
                <span className="text-[9px] font-bold bg-primary-500 text-white px-1.5 py-0.5 rounded-full">
                  {formatRupiah(a.harga)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Info */}
      {filtered.some((f) => f.album.tipe !== "GRATIS") && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800 flex items-start gap-3">
          <span className="text-lg leading-none">💡</span>
          <span>Klik foto berbayar untuk menambahkan ke keranjang, lalu isi data dan unggah bukti transfer.</span>
        </div>
      )}

      {/* Sticky cart bar */}
      {cart.size > 0 && !submitted && (
        <div className="sticky top-[76px] z-20 bg-white border border-primary-300 rounded-xl px-5 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {cart.size}
            </div>
            <span className="text-sm font-medium">
              {cart.size} foto · <span className="font-bold text-primary-600">{formatRupiah(totalHarga)}</span>
            </span>
          </div>
          <div className="flex gap-3 items-center">
            <button onClick={() => setCart(new Set())} className="text-sm text-gray-400 hover:text-neutral-600">
              Hapus
            </button>
            <button
              onClick={() => setShowCheckout(true)}
              className="bg-primary-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors"
            >
              Beli Foto →
            </button>
          </div>
        </div>
      )}

      {/* Grid Foto */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((foto) => {
          const isGratis = foto.album.tipe === "GRATIS";
          const inCart = cart.has(foto.id);
          return (
            <div
              key={foto.id}
              className={`relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                isGratis
                  ? "border-green-200"
                  : inCart
                  ? "border-primary-500 shadow-lg"
                  : "border-transparent hover:border-neutral-300"
              }`}
              onClick={() => !isGratis && toggleCart(foto.id)}
            >
              <div className="relative aspect-square bg-neutral-100">
                <Image
                  src={isGratis ? foto.pathAsli : foto.pathWatermark}
                  alt={foto.tagTim ?? "Foto LKBB Antareja"}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 50vw, 25vw"
                />

                {!isGratis && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 pointer-events-none select-none">
                    {["-30deg", "0deg", "30deg"].map((rot, i) => (
                      <span
                        key={i}
                        style={{ transform: `rotate(${rot})` }}
                        className="text-white/50 text-lg font-black tracking-[0.3em] drop-shadow-md"
                      >
                        ANTAREJA
                      </span>
                    ))}
                  </div>
                )}

                {isGratis && (
                  <div className="absolute top-2 left-2">
                    <span className="text-[9px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded-full">GRATIS</span>
                  </div>
                )}

                {isGratis && (
                  <a
                    href={toDownloadUrl(foto.pathAsli)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-2 right-2 bg-white text-black text-xs font-semibold px-3 py-1.5 rounded-lg shadow hover:bg-neutral-100 transition-colors"
                  >
                    Download
                  </a>
                )}

                {!isGratis && inCart && (
                  <div className="absolute inset-0 bg-primary-500/20 flex items-center justify-center">
                    <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg">
                      ✓
                    </div>
                  </div>
                )}

                {!isGratis && !inCart && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-3 py-1 rounded-full">
                      + Keranjang
                    </span>
                  </div>
                )}
              </div>

              {foto.tagTim && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent text-white text-xs px-2 py-2 truncate">
                  {foto.tagTim}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 z-[1100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 shrink-0">
              <h2 className="text-xl font-bold">Beli Foto</h2>
              <button
                onClick={() => setShowCheckout(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold text-xl transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex flex-col gap-4 px-6 py-5">
              <p className="text-sm text-gray-500">{cart.size} foto dipilih.</p>

              <form action={handleCheckout} className="flex flex-col gap-4">
                <input type="hidden" name="kodeUnik" value={kodeUnik} />

                {/* Info Pembayaran */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 flex flex-col gap-1">
                  <p className="font-semibold">Transfer ke:</p>
                  {konfig?.bankNoRek ? (
                    <>
                      <p>
                        <span className="font-bold">{konfig.bankNoRek}</span>
                        {" — "}{konfig.bankNama ?? "Bank"}
                      </p>
                      {konfig.bankAtasNama && <p>a.n {konfig.bankAtasNama}</p>}
                    </>
                  ) : (
                    <p className="italic text-blue-600">Info rekening belum dikonfigurasi admin.</p>
                  )}
                  <div className="border-t border-blue-200 mt-2 pt-2 flex flex-col gap-1">
                    <div className="flex justify-between">
                      <span>Nominal</span>
                      <span className="font-bold">{formatRupiah(totalHarga)}</span>
                    </div>
                    <div className="flex justify-between text-blue-600">
                      <span>Kode unik</span>
                      <span className="font-bold font-mono tracking-widest">+{kodeUnik}</span>
                    </div>
                    <div className="flex justify-between font-bold text-primary-700 text-base border-t border-blue-200 pt-1 mt-1">
                      <span>Transfer tepat</span>
                      <span>{formatRupiah(totalHarga + parseInt(kodeUnik))}</span>
                    </div>
                    <p className="text-xs text-blue-400 mt-0.5">Transfer nominal tepat agar mudah diverifikasi admin.</p>
                  </div>
                </div>

                {/* Nama */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">
                    Nama <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="namaPembeli"
                    type="text"
                    required
                    placeholder="Nama lengkap Anda"
                    className="border border-neutral-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">
                    Email <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-400 font-normal ml-1">— link foto dikirim ke sini</span>
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="email@contoh.com"
                    className="border border-neutral-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>

                {/* Bukti */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">
                    Bukti Transfer <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="bukti"
                    type="file"
                    accept="image/*"
                    required
                    className="border border-neutral-200 py-2 px-3 rounded-xl file:bg-primary-500 file:text-white file:rounded-md file:border-none file:py-1 file:px-3 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-primary-500 text-white rounded-xl py-3 font-bold hover:bg-primary-600 transition-colors"
                >
                  Kirim Pembelian — {formatRupiah(totalHarga + parseInt(kodeUnik))}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {submitted && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
          <div className="text-4xl">✅</div>
          <p className="text-green-800 font-semibold text-lg">Pembelian Diterima!</p>
          <p className="text-green-700 text-sm">
            Bukti transfer sedang diverifikasi admin. Setelah disetujui, link unduhan aktif dan akan dikirim ke email Anda.
          </p>
          {transaksiId && (
            <div className="flex flex-col items-center gap-2 w-full max-w-sm">
              <p className="text-xs text-green-600 font-medium">Simpan link berikut untuk cek & unduh foto:</p>
              <a
                href={`/galeri/download/${transaksiId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors text-sm"
              >
                Cek Status &amp; Unduh Foto →
              </a>
              <p className="text-[11px] text-green-500 break-all">
                /galeri/download/{transaksiId}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
