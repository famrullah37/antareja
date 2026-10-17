"use client";

import {
  hapusMenuMakanan,
  hapusSesiMakan,
  simpanMenuMakanan,
  simpanSesiMakan,
  toggleMenuMakanan,
} from "@/actions/Makanan";
import { formatRupiah, formatTanggalWib } from "@/app/(main)/merchandise/format";
import { toWibDatetimeLocal } from "@/lib/ujiCoba";
import { useRouter } from "next-nprogress-bar";
import { useState } from "react";
import { toast } from "sonner";

type Menu = { id: string; nama: string; deskripsi: string | null; harga: number; aktif: boolean; urutan: number };
type Sesi = {
  id: string;
  nama: string;
  waktu: Date;
  batasPesan: Date | null;
  aktif: boolean;
  menus: Menu[];
  _count: { pesanan: number };
};
type Hasil = { success: boolean; message?: string };

const inputCls =
  "border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400";
const btnPrimary =
  "bg-primary-500 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-60";

function useAksi() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function jalankan(fn: () => Promise<Hasil>, ok: string) {
    setBusy(true);
    const toastId = toast.loading("Memproses...");
    const r = await fn();
    setBusy(false);
    if (r.success) {
      toast.success(ok, { id: toastId });
      router.refresh();
    } else toast.error(r.message ?? "Gagal", { id: toastId });
    return r.success;
  }
  return { busy, jalankan };
}

function FormSesi({ sesi, onSelesai }: { sesi?: Sesi; onSelesai: () => void }) {
  const { busy, jalankan } = useAksi();
  return (
    <form
      action={async (data) => {
        if (sesi) data.set("id", sesi.id);
        if (await jalankan(() => simpanSesiMakan(data), "Sesi disimpan")) onSelesai();
      }}
      className="grid gap-3 sm:grid-cols-2 bg-neutral-50 rounded-xl p-4"
    >
      <div className="flex flex-col gap-1 sm:col-span-2">
        <label className="text-sm font-medium">Nama sesi</label>
        <input name="nama" required maxLength={100} defaultValue={sesi?.nama} placeholder="mis. Sabtu Siang" className={inputCls} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Waktu makan (WIB)</label>
        <input type="datetime-local" name="waktu" required defaultValue={toWibDatetimeLocal(sesi?.waktu)} className={inputCls} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">
          Batas pemesanan <span className="text-xs text-gray-400 font-normal">— kosong = sampai waktu makan</span>
        </label>
        <input type="datetime-local" name="batasPesan" defaultValue={toWibDatetimeLocal(sesi?.batasPesan)} className={inputCls} />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="aktif" defaultChecked={sesi?.aktif ?? true} className="w-4 h-4 accent-primary-500" />
        Sesi aktif (bisa dipesan)
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {sesi ? "Simpan Sesi" : "Tambah Sesi"}
        </button>
        <button type="button" onClick={onSelesai} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800">
          Batal
        </button>
      </div>
    </form>
  );
}

function FormMenu({ sesiId, menu, onSelesai }: { sesiId: string; menu?: Menu; onSelesai: () => void }) {
  const { busy, jalankan } = useAksi();
  return (
    <form
      action={async (data) => {
        data.set("sesiId", sesiId);
        if (menu) data.set("id", menu.id);
        if (await jalankan(() => simpanMenuMakanan(data), "Menu disimpan")) onSelesai();
      }}
      className="grid gap-2 sm:grid-cols-[2fr_1fr_80px] items-end bg-neutral-50 rounded-lg p-3"
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium">Nama menu</label>
        <input name="nama" required maxLength={100} defaultValue={menu?.nama} placeholder="mis. Nasi Ayam Bakar" className={inputCls} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium">Harga (Rp)</label>
        <input type="number" name="harga" required min={1} defaultValue={menu?.harga} className={inputCls} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium">Urutan</label>
        <input type="number" name="urutan" defaultValue={menu?.urutan ?? 0} className={inputCls} />
      </div>
      <div className="flex flex-col gap-1 sm:col-span-3">
        <label className="text-xs font-medium">Deskripsi (opsional)</label>
        <input name="deskripsi" maxLength={300} defaultValue={menu?.deskripsi ?? ""} placeholder="mis. + air mineral" className={inputCls} />
      </div>
      <div className="flex gap-2 sm:col-span-3">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {menu ? "Simpan Menu" : "Tambah Menu"}
        </button>
        <button type="button" onClick={onSelesai} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800">
          Batal
        </button>
      </div>
    </form>
  );
}

function KartuSesi({ sesi }: { sesi: Sesi }) {
  const { busy, jalankan } = useAksi();
  const [editSesi, setEditSesi] = useState(false);
  const [tambahMenu, setTambahMenu] = useState(false);
  const [editMenu, setEditMenu] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-5 flex flex-col gap-4">
      {editSesi ? (
        <FormSesi sesi={sesi} onSelesai={() => setEditSesi(false)} />
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{sesi.nama}</h3>
              {!sesi.aktif && <span className="text-xs bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">Nonaktif</span>}
            </div>
            <p className="text-sm text-gray-500">Makan: {formatTanggalWib(sesi.waktu)}</p>
            <p className="text-xs text-gray-400">
              Pemesanan ditutup: {formatTanggalWib(sesi.batasPesan ?? sesi.waktu)} · {sesi._count.pesanan} pesanan
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <button type="button" onClick={() => setEditSesi(true)} className="text-primary-600 hover:underline">
              Ubah
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => confirm(`Hapus sesi ${sesi.nama} beserta menunya?`) && jalankan(() => hapusSesiMakan(sesi.id), "Sesi dihapus")}
              className="text-gray-400 hover:text-red-600 disabled:opacity-60"
            >
              Hapus
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col divide-y divide-neutral-100 border border-neutral-200 rounded-xl">
        {sesi.menus.length === 0 && <p className="p-3 text-sm text-gray-400">Belum ada menu — sesi ini belum bisa dipesan.</p>}
        {sesi.menus.map((m) =>
          editMenu === m.id ? (
            <div key={m.id} className="p-2">
              <FormMenu sesiId={sesi.id} menu={m} onSelesai={() => setEditMenu(null)} />
            </div>
          ) : (
            <div key={m.id} className={`flex flex-wrap items-center gap-3 p-3 text-sm ${m.aktif ? "" : "opacity-50"}`}>
              <div className="flex-1 min-w-0">
                <div className="font-medium">
                  {m.nama} {!m.aktif && <span className="text-xs text-gray-400">(nonaktif)</span>}
                </div>
                {m.deskripsi && <div className="text-xs text-gray-400">{m.deskripsi}</div>}
              </div>
              <span className="font-semibold">{formatRupiah(m.harga)}</span>
              <div className="flex gap-3 text-xs">
                <button type="button" onClick={() => setEditMenu(m.id)} className="text-primary-600 hover:underline">
                  Ubah
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => jalankan(() => toggleMenuMakanan(m.id, !m.aktif), m.aktif ? "Menu dinonaktifkan" : "Menu diaktifkan")}
                  className="text-gray-500 hover:text-gray-800"
                >
                  {m.aktif ? "Nonaktifkan" : "Aktifkan"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => confirm(`Hapus menu ${m.nama}?`) && jalankan(() => hapusMenuMakanan(m.id), "Menu dihapus")}
                  className="text-gray-400 hover:text-red-600"
                >
                  Hapus
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {tambahMenu ? (
        <FormMenu sesiId={sesi.id} onSelesai={() => setTambahMenu(false)} />
      ) : (
        <button type="button" onClick={() => setTambahMenu(true)} className="self-start text-sm text-primary-600 font-semibold hover:underline">
          + Tambah menu
        </button>
      )}
    </div>
  );
}

export default function SesiMenuMakanan({ sesi }: { sesi: Sesi[] }) {
  const [tambah, setTambah] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Sesi Makan & Menu</h2>
        {!tambah && (
          <button type="button" onClick={() => setTambah(true)} className={btnPrimary}>
            + Sesi Makan
          </button>
        )}
      </div>
      {tambah && <FormSesi onSelesai={() => setTambah(false)} />}
      {sesi.length === 0 && !tambah && <p className="text-sm text-gray-400">Belum ada sesi makan.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {sesi.map((s) => (
          <KartuSesi key={s.id} sesi={s} />
        ))}
      </div>
    </div>
  );
}
