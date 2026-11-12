"use client";

import { jualProdukPOS, type StrukPOS } from "@/actions/PosProduk";
import { getDynamicQrisTiket } from "@/actions/Tiket";
import { CETAK_STRUK_AKTIF, labelMetodePOS, MAKS_JUMLAH_PER_ITEM_POS, type ItemPOS } from "@/lib/posProduk";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { cetakStruk } from "./struk";

type Varian = { id: string; nama: string; stok: number };
type Produk = { id: string; nama: string; harga: number; foto: string | null; varian: Varian[] };
type TransaksiHariIni = Omit<StrukPOS, "items"> & { items: ItemPOS[]; status: string };

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

function buatId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // Cadangan untuk browser lama / non-HTTPS
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (+c ^ (Math.random() * 16) >> (+c / 4)).toString(16)
  );
}

export default function KasirPOS({
  produk,
  qrisUrl,
  hariIni,
}: {
  produk: Produk[];
  qrisUrl: string | null;
  hariIni: TransaksiHariIni[];
}) {
  const router = useRouter();
  const [cari, setCari] = useState("");
  const [keranjang, setKeranjang] = useState<Record<string, number>>({});
  const [metode, setMetode] = useState<"CASH" | "QRIS">("CASH");
  const [uangDiterima, setUangDiterima] = useState("");
  const [namaPembeli, setNamaPembeli] = useState("");
  const [catatan, setCatatan] = useState("");
  const [qrisDinamis, setQrisDinamis] = useState<string | null>(null);
  const [struk, setStruk] = useState<StrukPOS | null>(null);
  // Id transaksi tetap sama sampai berhasil — kirim ulang setelah error jaringan
  // tidak membuat transaksi dobel.
  const [idTransaksi, setIdTransaksi] = useState(buatId);
  const [pending, startTransition] = useTransition();

  const varianMap = useMemo(() => {
    const m = new Map<string, { produk: Produk; varian: Varian }>();
    for (const p of produk) for (const v of p.varian) m.set(v.id, { produk: p, varian: v });
    return m;
  }, [produk]);

  const barisKeranjang = Object.entries(keranjang)
    .filter(([id, j]) => j > 0 && varianMap.has(id))
    .map(([id, jumlah]) => ({ id, jumlah, ...varianMap.get(id)! }));
  const total = barisKeranjang.reduce((s, b) => s + b.produk.harga * b.jumlah, 0);
  const totalItem = barisKeranjang.reduce((s, b) => s + b.jumlah, 0);
  const uang = parseInt(uangDiterima.replace(/\D/g, "")) || 0;
  const kembalian = uang - total;

  const produkTampil = produk.filter((p) => p.nama.toLowerCase().includes(cari.trim().toLowerCase()));

  // Hapus dari keranjang barang yang stoknya berubah/habis setelah refresh data
  useEffect(() => {
    setKeranjang((k) => {
      const baru: Record<string, number> = {};
      for (const [id, j] of Object.entries(k)) {
        const stok = varianMap.get(id)?.varian.stok ?? 0;
        if (stok > 0) baru[id] = Math.min(j, stok);
      }
      return baru;
    });
  }, [varianMap]);

  useEffect(() => {
    if (metode !== "QRIS" || total <= 0) {
      setQrisDinamis(null);
      return;
    }
    let batal = false;
    const t = setTimeout(async () => {
      const r = await getDynamicQrisTiket(total);
      if (!batal) setQrisDinamis(r.success ? r.dataUrl! : null);
    }, 300);
    return () => {
      batal = true;
      clearTimeout(t);
    };
  }, [metode, total]);

  function ubah(varianId: string, delta: number) {
    const stok = varianMap.get(varianId)?.varian.stok ?? 0;
    setKeranjang((k) => {
      const j = Math.max(0, Math.min((k[varianId] ?? 0) + delta, stok, MAKS_JUMLAH_PER_ITEM_POS));
      return { ...k, [varianId]: j };
    });
  }

  function reset() {
    setKeranjang({});
    setUangDiterima("");
    setNamaPembeli("");
    setCatatan("");
    setMetode("CASH");
    setIdTransaksi(buatId());
  }

  function bayar() {
    if (!barisKeranjang.length) return toast.error("Keranjang masih kosong");
    if (metode === "CASH" && uangDiterima && uang < total) return toast.error("Uang diterima kurang dari total");
    startTransition(async () => {
      const r = await jualProdukPOS({
        id: idTransaksi,
        items: barisKeranjang.map((b) => ({ varianId: b.id, jumlah: b.jumlah })),
        metodePembayaran: metode,
        uangDiterima: metode === "CASH" ? (uangDiterima ? uang : total) : null,
        namaPembeli,
        catatan,
      });
      if (r.success) {
        toast.success(`Transaksi ${r.struk.nomor} tersimpan`);
        setStruk(r.struk);
        reset();
        router.refresh();
      } else {
        toast.error(r.message);
        router.refresh(); // ambil stok terbaru
      }
    });
  }

  const selesai = hariIni.filter((t) => t.status === "SELESAI");
  const totalTunai = selesai.filter((t) => t.metodePembayaran === "CASH").reduce((s, t) => s + t.total, 0);
  const totalQris = selesai.filter((t) => t.metodePembayaran === "QRIS").reduce((s, t) => s + t.total, 0);
  const pecahan = [total, 50000, 100000, 150000, 200000].filter((n, i, a) => n >= total && n > 0 && a.indexOf(n) === i);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
        {/* Katalog */}
        <div className="flex flex-col gap-4">
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari produk..."
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm w-full"
          />
          {produkTampil.length === 0 ? (
            <p className="text-gray-500 text-sm">
              {produk.length === 0 ? "Belum ada produk aktif. Tambahkan di menu Produk POS." : "Produk tidak ditemukan."}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {produkTampil.map((p) => {
                const tanpaUkuran = p.varian.length === 1 && p.varian[0].nama === "";
                const totalStok = p.varian.reduce((s, v) => s + v.stok, 0);
                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-xl border border-neutral-200 overflow-hidden flex flex-col ${totalStok === 0 ? "opacity-50" : ""}`}
                  >
                    <button
                      type="button"
                      disabled={!tanpaUkuran || totalStok === 0}
                      onClick={() => ubah(p.varian[0].id, 1)}
                      className="text-left disabled:cursor-default"
                    >
                      {p.foto ? (
                        // eslint-disable-next-line @next/next/no-img-element -- foto produk Cloudinary, ukuran kecil
                        <img src={p.foto} alt={p.nama} className="w-full aspect-square object-cover bg-neutral-100" />
                      ) : (
                        <div className="w-full aspect-square bg-neutral-100 flex items-center justify-center text-3xl font-bold text-neutral-300">
                          {p.nama.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="px-3 pt-2">
                        <p className="font-semibold text-sm leading-tight">{p.nama}</p>
                        <p className="text-primary-600 font-bold text-sm">{rp(p.harga)}</p>
                        {tanpaUkuran && (
                          <p className="text-xs text-gray-500">{totalStok > 0 ? `Stok ${totalStok}` : "Habis"}</p>
                        )}
                      </div>
                    </button>
                    {!tanpaUkuran && (
                      <div className="px-3 pt-2 flex flex-wrap gap-1.5">
                        {p.varian.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            disabled={v.stok === 0 || (keranjang[v.id] ?? 0) >= v.stok}
                            onClick={() => ubah(v.id, 1)}
                            title={`Stok ${v.stok}`}
                            className="border border-neutral-300 rounded-md px-2 py-1 text-xs font-medium hover:border-primary-500 hover:bg-primary-50 disabled:opacity-40 disabled:hover:bg-transparent"
                          >
                            {v.nama} <span className="text-gray-500">({v.stok})</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="pb-3" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Keranjang & pembayaran */}
        <div className="bg-white rounded-xl border border-orange-200 p-4 flex flex-col gap-4 lg:sticky lg:top-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Keranjang</h3>
            {barisKeranjang.length > 0 && (
              <button type="button" onClick={() => setKeranjang({})} className="text-xs text-red-600 hover:underline">
                Kosongkan
              </button>
            )}
          </div>

          {barisKeranjang.length === 0 ? (
            <p className="text-sm text-gray-500">Klik produk untuk menambahkan.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-100 max-h-72 overflow-y-auto">
              {barisKeranjang.map((b) => (
                <li key={b.id} className="py-2 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {b.produk.nama}
                      {b.varian.nama ? ` (${b.varian.nama})` : ""}
                    </p>
                    <p className="text-xs text-gray-500">
                      {rp(b.produk.harga)} · {rp(b.produk.harga * b.jumlah)}
                    </p>
                  </div>
                  <button type="button" onClick={() => ubah(b.id, -1)} className="w-7 h-7 rounded-md border border-neutral-300 font-bold">
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{b.jumlah}</span>
                  <button
                    type="button"
                    onClick={() => ubah(b.id, 1)}
                    disabled={b.jumlah >= b.varian.stok}
                    className="w-7 h-7 rounded-md border border-neutral-300 font-bold disabled:opacity-40"
                  >
                    +
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="bg-orange-50 border border-orange-100 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-neutral-600">Total ({totalItem} barang)</span>
            <span className="font-bold text-orange-700 text-xl">{rp(total)}</span>
          </div>

          <div className="flex gap-2">
            {(["CASH", "QRIS"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetode(m)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium ${
                  metode === m ? "border-orange-500 bg-orange-50 text-orange-700" : "border-neutral-200 text-neutral-600"
                }`}
              >
                {labelMetodePOS(m)}
              </button>
            ))}
          </div>

          {metode === "CASH" && total > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Uang diterima</label>
              <input
                inputMode="numeric"
                value={uangDiterima ? uang.toLocaleString("id-ID") : ""}
                onChange={(e) => setUangDiterima(e.target.value)}
                placeholder={`Kosongkan = uang pas (${rp(total)})`}
                className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-1.5">
                {pecahan.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setUangDiterima(String(n))}
                    className="border border-neutral-300 rounded-md px-2 py-1 text-xs hover:bg-neutral-50"
                  >
                    {n === total ? "Uang pas" : rp(n)}
                  </button>
                ))}
              </div>
              {uangDiterima && (
                <p className={`text-sm font-semibold ${kembalian < 0 ? "text-red-600" : "text-green-700"}`}>
                  {kembalian < 0 ? `Kurang ${rp(-kembalian)}` : `Kembalian ${rp(kembalian)}`}
                </p>
              )}
            </div>
          )}

          {metode === "QRIS" && total > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex flex-col items-center gap-2 text-sm text-orange-800">
              {qrisDinamis ? (
                // eslint-disable-next-line @next/next/no-img-element -- QRIS dinamis (data URL)
                <img src={qrisDinamis} alt="QRIS" className="w-48 h-48 object-contain rounded-lg bg-white border border-orange-200" />
              ) : qrisUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- QRIS statis dari konfigurasi tiket
                <img src={qrisUrl} alt="QRIS" className="w-48 h-48 object-contain rounded-lg bg-white border border-orange-200" />
              ) : (
                <p className="text-center text-xs">QRIS belum dikonfigurasi di halaman Tiket</p>
              )}
              <p className="text-xs text-center">
                {qrisDinamis
                  ? "Nominal terisi otomatis. Simpan setelah pembayaran masuk."
                  : `QRIS statis: pembeli mengetik ${rp(total)}. Simpan setelah pembayaran masuk.`}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <input
              value={namaPembeli}
              onChange={(e) => setNamaPembeli(e.target.value)}
              placeholder="Nama pembeli (opsional)"
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Catatan (opsional)"
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={bayar}
            disabled={pending || total <= 0 || (metode === "CASH" && !!uangDiterima && kembalian < 0)}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-lg py-3"
          >
            {pending ? "Menyimpan..." : metode === "QRIS" ? "QRIS Diterima — Simpan" : "Terima Tunai — Simpan"}
          </button>
        </div>
      </div>

      {/* Transaksi hari ini — untuk setoran kasir */}
      <div>
        <h2 className="text-xl font-semibold mb-1">Transaksi Hari Ini</h2>
        <p className="text-sm text-gray-500 mb-3">
          {selesai.length} transaksi · Tunai <b>{rp(totalTunai)}</b> · QRIS <b>{rp(totalQris)}</b>
        </p>
        {hariIni.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada transaksi hari ini.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="px-3 py-2 text-left">No.</th>
                  <th className="px-3 py-2 text-left">Jam</th>
                  <th className="px-3 py-2 text-left">Barang</th>
                  <th className="px-3 py-2 text-left">Bayar</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {hariIni.map((t) => (
                  <tr key={t.id} className={t.status === "BATAL" ? "text-gray-400 line-through" : ""}>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{t.nomor}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                    </td>
                    <td className="px-3 py-2">
                      {t.items.map((i) => `${i.nama}${i.varian ? ` (${i.varian})` : ""} ×${i.jumlah}`).join(", ")}
                      <span className="block text-xs text-gray-500">Kasir: {t.kasirNama}</span>
                    </td>
                    <td className="px-3 py-2">{labelMetodePOS(t.metodePembayaran)}</td>
                    <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{rp(t.total)}</td>
                    <td className="px-3 py-2 text-right">
                      {CETAK_STRUK_AKTIF && t.status === "SELESAI" && (
                        <button type="button" onClick={() => cetakStruk(t)} className="text-xs text-primary-600 hover:underline no-underline">
                          Struk
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal transaksi berhasil */}
      {struk && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setStruk(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-gray-500">Transaksi berhasil</p>
            <p className="font-mono font-bold text-lg">{struk.nomor}</p>
            <p className="text-2xl font-bold text-orange-700">{rp(struk.total)}</p>
            {struk.metodePembayaran === "CASH" && struk.uangDiterima != null && (
              <p className="text-lg font-semibold text-green-700">Kembalian {rp(struk.uangDiterima - struk.total)}</p>
            )}
            <div className="flex gap-2 mt-2">
              {CETAK_STRUK_AKTIF && (
                <button
                  type="button"
                  onClick={() => {
                    if (!cetakStruk(struk)) toast.error("Pop-up diblokir browser — izinkan pop-up untuk mencetak");
                  }}
                  className="flex-1 border border-neutral-300 rounded-lg py-2 text-sm font-medium"
                >
                  Cetak Struk
                </button>
              )}
              <button
                type="button"
                onClick={() => setStruk(null)}
                className="flex-1 bg-orange-500 text-white rounded-lg py-2 text-sm font-semibold"
              >
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
