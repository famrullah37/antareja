"use client";

import { pesanMerchReady } from "@/actions/Merchandise";
import { daftarUkuran } from "@/lib/merchandise";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { formatRupiah } from "./format";

// Produk publik ready stock — tanpa harga beli.
export type ProdukReady = {
  id: string;
  nama: string;
  deskripsi: string | null;
  harga: number;
  fotos: string[];
  ukuran: string | null;
  stok: Record<string, number>; // ukuran ("" = tanpa ukuran) → stok
};

type Baris = { merchId: string; ukuran: string | null; jumlah: number };

const inputCls =
  "border border-gray-300 rounded-xl px-4 py-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary-400";

function KartuReady({ p, diKeranjang, onTambah }: { p: ProdukReady; diKeranjang: (u: string) => number; onTambah: (u: string | null) => void }) {
  const ukuranList = daftarUkuran(p.ukuran);
  const pilihan = ukuranList.length ? ukuranList : [""];
  const [ukuran, setUkuran] = useState<string | null>(null);
  const totalStok = pilihan.reduce((s, u) => s + (p.stok[u] ?? 0), 0);
  const sisa = (u: string) => (p.stok[u] ?? 0) - diKeranjang(u);
  const terpilih = ukuranList.length ? ukuran : "";

  return (
    <div className={`bg-white rounded-3xl border border-gray-200 overflow-hidden flex flex-col ${totalStok === 0 ? "opacity-60" : ""}`}>
      <div className="relative aspect-square bg-gray-100">
        {p.fotos[0] ? (
          <Image src={p.fotos[0]} alt={p.nama} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">Tanpa gambar</div>
        )}
        {totalStok === 0 && (
          <span className="absolute top-3 left-3 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-full">Habis</span>
        )}
      </div>
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="font-bold text-lg">{p.nama}</h3>
          <p className="text-primary-500 font-extrabold text-xl">{formatRupiah(p.harga)}</p>
          {p.deskripsi && <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{p.deskripsi}</p>}
        </div>
        {totalStok > 0 && (
          <div className="mt-auto flex flex-col gap-3">
            {ukuranList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {ukuranList.map((u) => (
                  <button
                    key={u}
                    type="button"
                    disabled={sisa(u) <= 0}
                    onClick={() => setUkuran(u)}
                    className={`min-w-[2.5rem] px-3 py-1.5 rounded-lg border-2 text-sm font-semibold disabled:opacity-40 disabled:line-through ${
                      ukuran === u ? "border-primary-500 bg-primary-50 text-primary-600" : "border-gray-200 text-gray-600"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500">
              {terpilih !== null ? `Sisa stok: ${Math.max(0, sisa(terpilih))}` : "Pilih ukuran untuk melihat stok"}
            </p>
            <button
              type="button"
              onClick={() => {
                if (ukuranList.length && !ukuran) return toast.error("Pilih ukuran dulu");
                if (sisa(terpilih ?? "") <= 0) return toast.error("Stok habis");
                onTambah(ukuranList.length ? ukuran : null);
              }}
              className="bg-primary-500 text-white rounded-xl py-2 text-sm font-bold hover:bg-primary-600"
            >
              + Keranjang
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReadyStockForm({ produk }: { produk: ProdukReady[] }) {
  const router = useRouter();
  const [keranjang, setKeranjang] = useState<Baris[]>([]);
  const [pengiriman, setPengiriman] = useState<"KIRIM" | "AMBIL">("KIRIM");
  const [pending, startTransition] = useTransition();

  const jumlahDi = (merchId: string, u: string) =>
    keranjang.filter((k) => k.merchId === merchId && (k.ukuran ?? "") === u).reduce((s, k) => s + k.jumlah, 0);

  function tambah(merchId: string, ukuran: string | null) {
    setKeranjang((prev) => {
      const i = prev.findIndex((k) => k.merchId === merchId && k.ukuran === ukuran);
      if (i < 0) return [...prev, { merchId, ukuran, jumlah: 1 }];
      return prev.map((k, j) => (j === i ? { ...k, jumlah: k.jumlah + 1 } : k));
    });
    toast.success("Ditambahkan ke keranjang");
  }

  function ubah(i: number, delta: number) {
    setKeranjang((prev) =>
      prev
        .map((k, j) => {
          if (j !== i) return k;
          const p = produk.find((x) => x.id === k.merchId)!;
          const maks = p.stok[k.ukuran ?? ""] ?? 0;
          return { ...k, jumlah: Math.min(maks, k.jumlah + delta) };
        })
        .filter((k) => k.jumlah > 0)
    );
  }

  const baris = keranjang.map((k) => ({ ...k, p: produk.find((x) => x.id === k.merchId)! })).filter((b) => b.p);
  const subtotal = baris.reduce((s, b) => s + b.p.harga * b.jumlah, 0);

  function kirim(data: FormData) {
    data.set("items", JSON.stringify(keranjang));
    data.set("pengiriman", pengiriman);
    startTransition(async () => {
      const r = await pesanMerchReady(data);
      if (r.success && "link" in r && r.link) {
        toast.success("Pesanan diterima! Detail juga dikirim ke email Anda.");
        router.push(r.link);
      } else toast.error(r.message ?? "Gagal memproses pesanan");
    });
  }

  return (
    <div className="flex flex-col gap-8 mt-6">
      <div className="bg-teal-50 border border-teal-200 text-teal-900 rounded-2xl p-4 text-sm">
        <b>Ready stock</b> — pre-order sudah ditutup, tapi masih ada stok yang bisa dibeli. Pilih <b>dikirim</b> (ongkir
        dihitung panitia dulu, lalu Anda bayar total lewat link di email) atau <b>ambil sendiri</b> (langsung bayar).
        Pembayaran paling lambat 2×24 jam setelah total dikonfirmasi.
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {produk.map((p) => (
          <KartuReady key={p.id} p={p} diKeranjang={(u) => jumlahDi(p.id, u)} onTambah={(u) => tambah(p.id, u)} />
        ))}
      </div>

      {baris.length > 0 && (
        <form action={kirim} className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-4 max-w-2xl w-full mx-auto">
          <h3 className="font-semibold text-lg">Keranjang</h3>
          <div className="flex flex-col divide-y divide-gray-100">
            {baris.map((b, i) => (
              <div key={`${b.merchId}-${b.ukuran}`} className="flex items-center gap-3 py-2 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {b.p.nama}
                    {b.ukuran && <span className="text-gray-500"> · {b.ukuran}</span>}
                  </p>
                  <p className="text-gray-400 text-xs">{formatRupiah(b.p.harga)}</p>
                </div>
                <button type="button" onClick={() => ubah(i, -1)} className="w-8 h-8 rounded-lg border border-gray-300 font-bold">
                  −
                </button>
                <span className="w-6 text-center font-semibold">{b.jumlah}</span>
                <button type="button" onClick={() => ubah(i, 1)} className="w-8 h-8 rounded-lg border border-gray-300 font-bold">
                  +
                </button>
                <span className="w-24 text-right font-semibold">{formatRupiah(b.p.harga * b.jumlah)}</span>
              </div>
            ))}
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-sm flex justify-between font-bold">
            <span>Subtotal barang</span>
            <span className="text-primary-600">{formatRupiah(subtotal)}</span>
          </div>

          <h3 className="font-semibold text-lg mt-2">Cara Pengambilan</h3>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["KIRIM", "Dikirim", "Ongkir dikonfirmasi panitia"],
                ["AMBIL", "Ambil sendiri", "Tanpa ongkir, langsung bayar"],
              ] as const
            ).map(([v, judul, ket]) => (
              <button
                key={v}
                type="button"
                onClick={() => setPengiriman(v)}
                className={`rounded-xl border-2 p-3 text-left ${
                  pengiriman === v ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-400"
                }`}
              >
                <p className="font-semibold text-sm">{judul}</p>
                <p className="text-xs text-gray-500">{ket}</p>
              </button>
            ))}
          </div>
          {pengiriman === "KIRIM" && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">
                Alamat Pengiriman Lengkap <span className="text-red-500">*</span>
              </label>
              <textarea
                name="alamat"
                required
                rows={3}
                minLength={15}
                placeholder="Nama jalan & nomor, RT/RW, kelurahan, kecamatan, kota, provinsi, kode pos"
                className={inputCls}
              />
            </div>
          )}

          <h3 className="font-semibold text-lg mt-2">Data Pemesan</h3>
          <input name="nama" required placeholder="Nama lengkap" className={inputCls} />
          <input name="email" type="email" required placeholder="Email — link pesanan & total bayar dikirim ke sini" className={inputCls} />
          <input name="noHp" required placeholder="No. WhatsApp (08xxxxxxxxxx)" className={inputCls} />

          <button
            type="submit"
            disabled={pending}
            className="bg-primary-500 text-white rounded-xl py-4 font-bold hover:bg-primary-600 disabled:opacity-50"
          >
            {pending ? "Memproses..." : pengiriman === "KIRIM" ? "Pesan & Minta Ongkir" : "Pesan & Lanjut Bayar"}
          </button>
        </form>
      )}
    </div>
  );
}
