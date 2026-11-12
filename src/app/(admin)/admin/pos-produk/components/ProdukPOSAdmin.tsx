"use client";

import {
  createProdukPOS,
  deleteProdukPOS,
  toggleAktifProdukPOS,
  ubahStokVarianPOS,
  updateProdukPOS,
} from "@/actions/PosProduk";
import SubmitButton from "@/app/components/global/SubmitButton";
import type { ProdukPOS, VarianProdukPOS } from "@prisma/client";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

type Produk = ProdukPOS & { varian: VarianProdukPOS[] };

const inputCls = "border border-neutral-300 rounded-lg px-3 py-2 text-sm w-full";
const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

function FieldsProduk({ p }: { p?: Produk }) {
  const ukuran = p?.varian.map((v) => v.nama).filter(Boolean).join(",") ?? "";
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Nama Produk</label>
        <input name="nama" required defaultValue={p?.nama} placeholder="Kaos Antareja" className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            Harga Beli <span className="text-gray-500 font-normal">(modal)</span>
          </label>
          <input
            name="hargaBeli"
            type="number"
            min={0}
            defaultValue={p?.hargaBeli ?? ""}
            placeholder="60000"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Harga Jual</label>
          <input name="harga" type="number" min={1} required defaultValue={p?.harga} placeholder="85000" className={inputCls} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">
          Ukuran/Varian <span className="text-gray-500 font-normal">— pisah koma, kosongkan jika tidak ada</span>
        </label>
        <input name="ukuran" defaultValue={ukuran} placeholder="S,M,L,XL" className={inputCls} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Urutan Tampil</label>
        <input name="urutan" type="number" defaultValue={p?.urutan ?? 0} className={inputCls} />
      </div>
      <div className="flex flex-col gap-1 sm:col-span-2">
        <label className="text-sm font-medium">
          {p?.foto ? "Ganti Foto" : "Foto"} <span className="text-gray-500 font-normal">— opsional, maks. 10MB</span>
        </label>
        <input
          name="foto"
          type="file"
          accept="image/*"
          className="border border-neutral-200 py-2 px-3 rounded-lg text-sm file:bg-primary-500 file:text-white file:rounded-md file:border-none file:py-1 file:px-3"
        />
      </div>
    </div>
  );
}

function BarisStok({ v }: { v: VarianProdukPOS }) {
  const [delta, setDelta] = useState("");
  const [pending, startTransition] = useTransition();

  function simpan(tanda: 1 | -1) {
    const n = parseInt(delta);
    if (!Number.isInteger(n) || n <= 0) return toast.error("Isi jumlah lebih dari 0");
    startTransition(async () => {
      const r = await ubahStokVarianPOS(v.id, n * tanda);
      if (r.success) {
        toast.success(`Stok ${tanda > 0 ? "ditambah" : "dikurangi"} ${n}`);
        setDelta("");
      } else toast.error(r.message ?? "Gagal mengubah stok");
    });
  }

  return (
    <tr>
      <td className="py-1.5 pr-3">{v.nama || "—"}</td>
      <td className={`py-1.5 pr-3 font-semibold ${v.stok === 0 ? "text-red-600" : ""}`}>{v.stok}</td>
      <td className="py-1.5">
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            placeholder="Jml"
            className="border border-neutral-300 rounded-md px-2 py-1 text-sm w-20"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => simpan(1)}
            className="border border-green-300 text-green-700 rounded-md px-2 py-1 text-xs font-semibold disabled:opacity-50"
          >
            + Tambah
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => simpan(-1)}
            className="border border-red-300 text-red-700 rounded-md px-2 py-1 text-xs font-semibold disabled:opacity-50"
          >
            − Kurangi
          </button>
        </div>
      </td>
    </tr>
  );
}

function KartuProduk({ p }: { p: Produk }) {
  const [edit, setEdit] = useState(false);
  const [pending, startTransition] = useTransition();
  const totalStok = p.varian.reduce((s, v) => s + v.stok, 0);

  async function handleUpdate(data: FormData) {
    const toastId = toast.loading("Menyimpan...");
    let r = await updateProdukPOS(data, p.id);
    if (!r.success && "perluKonfirmasi" in r && r.perluKonfirmasi) {
      toast.dismiss(toastId);
      if (!window.confirm(r.message)) return;
      data.set("konfirmasiHapusStok", "1");
      r = await updateProdukPOS(data, p.id);
    }
    if (r.success) {
      toast.success("Produk disimpan", { id: toastId });
      setEdit(false);
    } else toast.error(r.message ?? "Gagal menyimpan", { id: toastId });
  }

  return (
    <div className={`bg-white rounded-xl border border-neutral-200 p-4 flex flex-col gap-3 ${p.aktif ? "" : "opacity-60"}`}>
      <div className="flex gap-3">
        {p.foto ? (
          // eslint-disable-next-line @next/next/no-img-element -- foto produk Cloudinary
          <img src={p.foto} alt={p.nama} className="w-16 h-16 rounded-lg object-cover bg-neutral-100" />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-neutral-100 flex items-center justify-center text-2xl font-bold text-neutral-300">
            {p.nama.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold">{p.nama}</p>
          <p className="text-sm">
            <span className="text-gray-500">Jual</span> <b className="text-primary-600">{rp(p.harga)}</b>
            <span className="text-gray-500"> · Beli </span>
            {p.hargaBeli == null ? <span className="text-amber-600">belum diisi</span> : <b>{rp(p.hargaBeli)}</b>}
          </p>
          {p.hargaBeli != null && (
            <p className={`text-xs font-semibold ${p.harga - p.hargaBeli < 0 ? "text-red-600" : "text-green-700"}`}>
              {p.harga - p.hargaBeli < 0 ? "Rugi" : "Laba"} {rp(Math.abs(p.harga - p.hargaBeli))}/barang
              {p.hargaBeli > 0 && ` (${Math.round(((p.harga - p.hargaBeli) / p.hargaBeli) * 100)}%)`}
            </p>
          )}
          <p className="text-xs text-gray-500">
            Total stok {totalStok} · {p.aktif ? "Dijual" : "Disembunyikan dari kasir"}
          </p>
        </div>
      </div>

      <table className="text-sm">
        <thead className="text-gray-500 text-xs text-left">
          <tr>
            <th className="font-medium pb-1">Ukuran</th>
            <th className="font-medium pb-1">Stok</th>
            <th className="font-medium pb-1">Ubah stok</th>
          </tr>
        </thead>
        <tbody>
          {p.varian.map((v) => (
            <BarisStok key={v.id} v={v} />
          ))}
        </tbody>
      </table>

      {edit && (
        <form action={handleUpdate} className="flex flex-col gap-3 border-t border-neutral-100 pt-3">
          <FieldsProduk p={p} />
          <p className="text-xs text-gray-500">Ukuran baru mulai dengan stok 0 — isi lewat tabel stok di atas.</p>
          <div className="flex gap-2">
            <SubmitButton text="Simpan" className="w-fit px-4" />
            <button type="button" onClick={() => setEdit(false)} className="text-sm text-gray-600 px-3">
              Batal
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-3 text-xs border-t border-neutral-100 pt-3">
        {!edit && (
          <button type="button" onClick={() => setEdit(true)} className="text-primary-600 hover:underline">
            Edit
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await toggleAktifProdukPOS(p.id, !p.aktif);
              if (!r.success) toast.error(r.message);
            })
          }
          className="text-gray-700 hover:underline"
        >
          {p.aktif ? "Sembunyikan dari kasir" : "Tampilkan di kasir"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(`Hapus produk "${p.nama}"? Riwayat transaksi tetap tersimpan.`)) return;
            startTransition(async () => {
              const r = await deleteProdukPOS(p.id);
              if (r.success) toast.success("Produk dihapus");
              else toast.error(r.message);
            });
          }}
          className="text-red-600 hover:underline"
        >
          Hapus
        </button>
      </div>
    </div>
  );
}

export default function ProdukPOSAdmin({ produk }: { produk: Produk[] }) {
  const [tambah, setTambah] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleCreate(data: FormData) {
    const toastId = toast.loading("Menambahkan...");
    const r = await createProdukPOS(data);
    if (r.success) {
      toast.success("Produk ditambahkan", { id: toastId });
      formRef.current?.reset();
      setTambah(false);
    } else toast.error(r.message ?? "Gagal menambahkan", { id: toastId });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Produk & Stok</h2>
        {!tambah && (
          <button
            type="button"
            onClick={() => setTambah(true)}
            className="bg-primary-500 hover:bg-primary-600 text-white rounded-lg px-4 py-2 text-sm font-semibold"
          >
            + Tambah Produk
          </button>
        )}
      </div>

      {tambah && (
        <form ref={formRef} action={handleCreate} className="bg-white rounded-xl border border-neutral-200 p-4 flex flex-col gap-3">
          <FieldsProduk />
          <div className="flex flex-col gap-1 max-w-xs">
            <label className="text-sm font-medium">
              Stok Awal <span className="text-gray-500 font-normal">— per ukuran</span>
            </label>
            <input name="stokAwal" type="number" min={0} defaultValue={0} className={inputCls} />
          </div>
          <div className="flex gap-2">
            <SubmitButton text="Tambah" className="w-fit px-4" />
            <button type="button" onClick={() => setTambah(false)} className="text-sm text-gray-600 px-3">
              Batal
            </button>
          </div>
        </form>
      )}

      {produk.length === 0 ? (
        <p className="text-gray-500 text-sm">Belum ada produk.</p>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {produk.map((p) => (
            <KartuProduk key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
