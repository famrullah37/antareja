"use client";

import {
  createMerchandise,
  deleteMerchandise,
  hapusFotoMerchandise,
  toggleAktifMerchandise,
  updateMerchandise,
} from "@/actions/Merchandise";
import SubmitButton from "@/app/components/global/SubmitButton";
import { Merchandise } from "@prisma/client";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";

const inputCls = "border border-neutral-300 rounded-lg px-3 py-2 text-sm w-full";

function FieldsProduk({ p }: { p?: Merchandise }) {
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Nama Produk</label>
          <input name="nama" required defaultValue={p?.nama} placeholder="Kaos Antareja 2026" className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Harga (Rp)</label>
          <input name="harga" type="number" min={1} required defaultValue={p?.harga} placeholder="85000" className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            Pilihan Ukuran <span className="text-gray-400 font-normal">— pisah koma, kosongkan jika tidak ada</span>
          </label>
          <input name="ukuran" defaultValue={p?.ukuran ?? ""} placeholder="S,M,L,XL,XXL" className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Urutan Tampil</label>
          <input name="urutan" type="number" defaultValue={p?.urutan ?? 0} className={inputCls} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Deskripsi</label>
        <textarea name="deskripsi" rows={2} defaultValue={p?.deskripsi ?? ""} placeholder="Bahan cotton combed 30s, sablon plastisol" className={inputCls} />
      </div>
    </>
  );
}

function InputGambar({ wajib }: { wajib?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium">
        {wajib ? "Gambar Produk" : "Tambah Gambar"}{" "}
        <span className="text-gray-400 font-normal">— bisa pilih beberapa (maks. 6, 10MB/gambar), gambar pertama = sampul</span>
      </label>
      <input
        name="fotos"
        type="file"
        accept="image/*"
        multiple
        required={wajib}
        className="border border-neutral-200 py-2 px-3 rounded-lg text-sm file:bg-primary-500 file:text-white file:rounded-md file:border-none file:py-1 file:px-3"
      />
    </div>
  );
}

function KartuAdmin({ p }: { p: Merchandise }) {
  const [edit, setEdit] = useState(false);

  async function handleUpdate(data: FormData) {
    const toastId = toast.loading("Menyimpan...");
    const r = await updateMerchandise(data, p.id);
    if (r.success) {
      toast.success("Produk disimpan", { id: toastId });
      setEdit(false);
    } else toast.error(r.message ?? "Gagal menyimpan", { id: toastId });
  }

  async function handleHapusFoto(url: string) {
    const r = await hapusFotoMerchandise(p.id, url);
    if (r.success) toast.success("Gambar dihapus");
    else toast.error(r.message ?? "Gagal menghapus gambar");
  }

  async function handleToggle() {
    const r = await toggleAktifMerchandise(p.id, !p.aktif);
    if (!r.success) toast.error("Gagal mengubah status");
  }

  async function handleDelete() {
    if (!confirm(`Hapus produk "${p.nama}"? Pesanan yang sudah ada tidak terpengaruh.`)) return;
    const r = await deleteMerchandise(p.id);
    if (r.success) toast.success("Produk dihapus");
    else toast.error("Gagal menghapus");
  }

  return (
    <div className={`bg-white rounded-xl border border-neutral-200 p-4 flex flex-col gap-3 ${p.aktif ? "" : "opacity-60"}`}>
      <div className="flex gap-2 overflow-x-auto">
        {p.fotos.map((f) => (
          <div key={f} className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-neutral-100">
            <Image src={f} alt={p.nama} fill sizes="80px" className="object-cover" />
            {edit && p.fotos.length > 1 && (
              <button
                type="button"
                onClick={() => handleHapusFoto(f)}
                aria-label="Hapus gambar"
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs leading-none"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {edit ? (
        <form action={handleUpdate} className="flex flex-col gap-3">
          <FieldsProduk p={p} />
          <InputGambar />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEdit(false)} className="px-4 py-2 text-sm rounded-lg border border-neutral-300">
              Batal
            </button>
            <SubmitButton text="Simpan" />
          </div>
        </form>
      ) : (
        <>
          <div>
            <p className="font-semibold">{p.nama}</p>
            <p className="text-primary-500 font-bold">Rp{p.harga.toLocaleString("id-ID")}</p>
            {p.ukuran && <p className="text-xs text-gray-500">Ukuran: {p.ukuran.split(",").join(", ")}</p>}
            {!p.aktif && <p className="text-xs text-red-500 font-medium">Disembunyikan</p>}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button onClick={() => setEdit(true)} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100">
              Edit
            </button>
            <button onClick={handleToggle} className="px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200">
              {p.aktif ? "Sembunyikan" : "Tampilkan"}
            </button>
            <button onClick={handleDelete} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
              Hapus
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function ProdukMerch({ produk }: { produk: Merchandise[] }) {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleCreate(data: FormData) {
    const toastId = toast.loading("Mengunggah gambar & menyimpan...");
    const r = await createMerchandise(data);
    if (r.success) {
      toast.success("Produk ditambahkan", { id: toastId });
      formRef.current?.reset();
    } else toast.error(r.message ?? "Gagal menambahkan produk", { id: toastId });
  }

  return (
    <div className="flex flex-col gap-4">
      <form ref={formRef} action={handleCreate} className="bg-white rounded-xl border border-neutral-200 p-6 flex flex-col gap-3 max-w-2xl">
        <h3 className="font-semibold text-lg">Tambah Produk</h3>
        <FieldsProduk />
        <InputGambar wajib />
        <div className="flex justify-end">
          <SubmitButton text="Tambah Produk" />
        </div>
      </form>

      <h2 className="text-xl font-semibold">Daftar Produk</h2>
      {produk.length === 0 ? (
        <p className="text-gray-400 text-sm">Belum ada produk.</p>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {produk.map((p) => (
            <KartuAdmin key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
