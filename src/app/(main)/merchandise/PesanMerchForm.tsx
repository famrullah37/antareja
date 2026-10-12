"use client";

import { pesanMerchandise, reserveKodeMerch } from "@/actions/Merchandise";
import { getDynamicQrisTiket } from "@/actions/Tiket";
import { daftarUkuran } from "@/lib/merchandise";
import { Merchandise } from "@prisma/client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatRupiah } from "./format";

type KonfigBayar = {
  qrisUrl?: string | null;
  bankNama?: string | null;
  bankNoRek?: string | null;
  bankAtasNama?: string | null;
} | null;

type BarisKeranjang = { merchId: string; ukuran: string | null; jumlah: number };

const inputCls =
  "border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400";

function KartuProduk({
  p,
  terbuka,
  onTambah,
}: {
  p: Merchandise;
  terbuka: boolean;
  onTambah: (ukuran: string | null, jumlah: number) => void;
}) {
  const ukuranList = daftarUkuran(p.ukuran);
  const [fotoAktif, setFotoAktif] = useState(0);
  const [ukuran, setUkuran] = useState<string | null>(null);
  const [jumlah, setJumlah] = useState(1);
  const foto = p.fotos[fotoAktif] ?? p.fotos[0];

  return (
    <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden flex flex-col">
      <div className="relative aspect-square bg-gray-100">
        {foto ? (
          <Image src={foto} alt={p.nama} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">Tanpa gambar</div>
        )}
      </div>
      {p.fotos.length > 1 && (
        <div className="flex gap-2 px-4 pt-3 overflow-x-auto">
          {p.fotos.map((f, i) => (
            <button
              key={f}
              type="button"
              onClick={() => setFotoAktif(i)}
              aria-label={`Gambar ${i + 1}`}
              className={`relative w-14 h-14 shrink-0 rounded-lg overflow-hidden border-2 ${
                i === fotoAktif ? "border-primary-500" : "border-transparent"
              }`}
            >
              <Image src={f} alt="" fill sizes="56px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="font-bold text-lg">{p.nama}</h3>
          <p className="text-primary-500 font-extrabold text-xl">{formatRupiah(p.harga)}</p>
          {p.deskripsi && <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{p.deskripsi}</p>}
        </div>

        {terbuka && (
          <div className="mt-auto flex flex-col gap-3">
            {ukuranList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {ukuranList.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUkuran(u)}
                    className={`min-w-[2.5rem] px-3 py-1.5 rounded-lg border-2 text-sm font-semibold transition-colors ${
                      ukuran === u
                        ? "border-primary-500 bg-primary-50 text-primary-600"
                        : "border-gray-200 text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setJumlah((j) => Math.max(1, j - 1))}
                className="w-9 h-9 rounded-lg border border-gray-300 font-bold"
              >
                −
              </button>
              <span className="min-w-[2rem] text-center font-semibold">{jumlah}</span>
              <button
                type="button"
                onClick={() => setJumlah((j) => Math.min(50, j + 1))}
                className="w-9 h-9 rounded-lg border border-gray-300 font-bold"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => {
                  if (ukuranList.length && !ukuran) {
                    toast.error("Pilih ukuran dulu");
                    return;
                  }
                  onTambah(ukuranList.length ? ukuran : null, jumlah);
                  setJumlah(1);
                }}
                className="flex-1 bg-primary-500 text-white rounded-xl py-2 text-sm font-bold hover:bg-primary-600 transition-colors"
              >
                + Keranjang
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PesanMerchForm({
  produk,
  terbuka,
  konfig,
}: {
  produk: Merchandise[];
  terbuka: boolean;
  konfig: KonfigBayar;
}) {
  const [keranjang, setKeranjang] = useState<BarisKeranjang[]>([]);
  const [metode, setMetode] = useState<"TRANSFER" | "QRIS">("TRANSFER");
  const [kodeUnik, setKodeUnik] = useState<string | null>(null);
  const [reservingKode, setReservingKode] = useState(false);
  const [qrisDinamis, setQrisDinamis] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const baris = keranjang
    .map((k) => ({ ...k, p: produk.find((p) => p.id === k.merchId)! }))
    .filter((k) => k.p);
  const subtotal = baris.reduce((s, k) => s + k.p.harga * k.jumlah, 0);
  const totalBayar = kodeUnik ? subtotal + parseInt(kodeUnik) : subtotal;
  const adaIsi = baris.length > 0;

  function tambah(merchId: string, ukuran: string | null, jumlah: number) {
    setKeranjang((prev) => {
      const ada = prev.find((k) => k.merchId === merchId && k.ukuran === ukuran);
      if (ada)
        return prev.map((k) => (k === ada ? { ...k, jumlah: Math.min(50, k.jumlah + jumlah) } : k));
      return [...prev, { merchId, ukuran, jumlah }];
    });
    toast.success("Ditambahkan ke keranjang");
  }

  // Kode unik dicadangkan sekali saat keranjang pertama kali terisi.
  useEffect(() => {
    if (!adaIsi || kodeUnik || reservingKode) return;
    setReservingKode(true);
    reserveKodeMerch().then((r) => {
      setReservingKode(false);
      if (r.success) setKodeUnik(r.kodeUnik!);
      else toast.error("Gagal menyiapkan kode pembayaran, muat ulang halaman");
    });
  }, [adaIsi, kodeUnik, reservingKode]);

  useEffect(() => {
    if (metode !== "QRIS" || !kodeUnik || subtotal <= 0) {
      setQrisDinamis(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const r = await getDynamicQrisTiket(totalBayar);
      if (!cancelled) setQrisDinamis(r.success ? r.dataUrl! : null);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [metode, totalBayar, kodeUnik, subtotal]);

  async function handleSubmit(data: FormData) {
    data.set("items", JSON.stringify(keranjang));
    const toastId = toast.loading("Memproses pesanan...");
    const result = await pesanMerchandise(data);
    if (result.success) {
      toast.success("Pesanan diterima!", { id: toastId });
      setSubmitted(true);
    } else {
      toast.error(result.message ?? "Gagal memproses pesanan", { id: toastId });
      if (result.message?.includes("sudah terpakai")) {
        setKodeUnik(null);
      }
    }
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center mt-6">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-xl font-bold text-green-800 mb-2">Pre-Order Diterima!</h2>
        <p className="text-green-700 text-sm">
          Panitia akan memverifikasi pembayaran Anda. Bukti pemesanan dikirim ke email setelah
          pesanan disetujui.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 mt-6">
      {!terbuka && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-sm">
          Pre-order sedang ditutup. Produk di bawah hanya untuk dilihat.
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {produk.map((p) => (
          <KartuProduk key={p.id} p={p} terbuka={terbuka} onTambah={(u, j) => tambah(p.id, u, j)} />
        ))}
      </div>

      {terbuka && adaIsi && (
        <form action={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-4 max-w-2xl w-full mx-auto">
          <h3 className="font-semibold text-lg">Keranjang</h3>
          <div className="flex flex-col divide-y divide-gray-100">
            {baris.map((k, i) => (
              <div key={`${k.merchId}-${k.ukuran}`} className="flex items-center gap-3 py-2 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {k.p.nama}
                    {k.ukuran && <span className="text-gray-500"> · {k.ukuran}</span>}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {formatRupiah(k.p.harga)} × {k.jumlah}
                  </p>
                </div>
                <span className="font-semibold">{formatRupiah(k.p.harga * k.jumlah)}</span>
                <button
                  type="button"
                  onClick={() => setKeranjang((prev) => prev.filter((_, j) => j !== i))}
                  className="text-red-500 text-xs hover:underline"
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-sm flex justify-between font-bold">
            <span>Total (+ kode unik)</span>
            <span className="text-primary-600">{formatRupiah(totalBayar)}</span>
          </div>

          <h3 className="font-semibold text-lg mt-2">Data Pemesan</h3>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Nama Lengkap</label>
            <input name="nama" required placeholder="Nama pemesan" className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              Email <span className="text-red-500">*</span>
              <span className="text-xs text-gray-400 font-normal ml-1">— bukti pemesanan dikirim ke sini setelah disetujui</span>
            </label>
            <input name="email" type="email" required placeholder="email@contoh.com" className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              No. WhatsApp <span className="text-red-500">*</span>
            </label>
            <input name="noHp" required placeholder="08xxxxxxxxxx" className={inputCls} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Metode Pembayaran</label>
            <div className="flex gap-3">
              {(["TRANSFER", "QRIS"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetode(m)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                    metode === m
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-gray-200 text-gray-600 hover:border-neutral-400"
                  }`}
                >
                  {m === "TRANSFER" ? "Transfer Bank" : "QRIS"}
                </button>
              ))}
            </div>
            <input type="hidden" name="metodePembayaran" value={metode} />
            <input type="hidden" name="kodeUnik" value={kodeUnik ?? ""} />
          </div>

          {!kodeUnik ? (
            <p className="text-sm text-gray-400">Menyiapkan kode pembayaran...</p>
          ) : metode === "TRANSFER" ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 flex flex-col gap-1">
              <p className="font-semibold">Transfer ke:</p>
              {konfig?.bankNoRek ? (
                <>
                  <p>
                    <span className="font-bold">{konfig.bankNoRek}</span> — {konfig.bankNama ?? "Bank"}
                  </p>
                  {konfig.bankAtasNama && <p>a.n {konfig.bankAtasNama}</p>}
                </>
              ) : (
                <p className="italic text-blue-600">Info rekening belum dikonfigurasi admin.</p>
              )}
              <div className="mt-1 border-t border-blue-200 pt-2 flex flex-col gap-0.5">
                <div className="flex justify-between">
                  <span>Nominal transfer tepat</span>
                  <span className="font-bold">{formatRupiah(totalBayar)}</span>
                </div>
                <div className="flex justify-between text-blue-600">
                  <span>Kode unik</span>
                  <span className="font-bold font-mono tracking-widest">+{kodeUnik}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-800 flex flex-col items-center gap-2">
              <p className="font-semibold">Scan QRIS berikut:</p>
              {qrisDinamis ? (
                // eslint-disable-next-line @next/next/no-img-element -- QRIS dinamis (data URL sekali pakai)
                <img src={qrisDinamis} alt="QRIS Dinamis" className="w-48 h-48 object-contain rounded-lg border border-purple-200 bg-white" />
              ) : konfig?.qrisUrl ? (
                <Image src={konfig.qrisUrl} alt="QRIS" width={192} height={192} className="w-48 h-48 object-contain rounded-lg border border-purple-200 bg-white" />
              ) : (
                <div className="w-40 h-40 bg-white border border-purple-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                  QRIS belum dikonfigurasi
                </div>
              )}
              <p className="font-semibold">Nominal: {formatRupiah(totalBayar)}</p>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              Bukti Pembayaran {metode === "TRANSFER" && <span className="text-red-500">*</span>}
              {metode === "QRIS" && (
                <span className="text-xs text-gray-400 font-normal ml-1">— opsional, admin cek dari riwayat QRIS</span>
              )}
            </label>
            <input
              name="bukti"
              type="file"
              accept="image/*"
              required={metode === "TRANSFER"}
              className="border border-gray-200 py-3 px-3 rounded-xl file:bg-primary-500 file:text-white file:rounded-md file:border-none file:py-1 hover:cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={!kodeUnik}
            className="bg-primary-500 text-white rounded-xl py-4 font-bold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Kirim Pre-Order
          </button>
        </form>
      )}
    </div>
  );
}
