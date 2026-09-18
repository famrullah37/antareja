"use client";

import { saveKonfigVoting } from "@/actions/Voting";
import type { KategoriVoting } from "@/queries/voting.query";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

type Konfig = {
  aktif: boolean;
  nominalVote: number;
  bankNama?: string | null;
  bankNoRek?: string | null;
  bankAtasNama?: string | null;
  mulaiPada?: Date | string | null;
  tutupPada?: Date | string | null;
  kategoriList?: KategoriVoting[] | null;
};

const UNIT_LABEL: Record<KategoriVoting["unit"], string> = {
  TIM: "Tim",
  PELATIH: "Pelatih",
  DANTON: "Danton",
};

function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function KonfigVotingForm({
  konfig,
  qrisUrlTiket,
}: {
  konfig: Konfig | null;
  qrisUrlTiket?: string | null;
}) {
  const [kategoriList, setKategoriList] = useState<Pick<KategoriVoting, "label" | "unit">[]>(
    konfig?.kategoriList?.map((k) => ({ label: k.label, unit: k.unit })) ?? []
  );

  function updateKategori(idx: number, patch: Partial<{ label: string; unit: KategoriVoting["unit"] }>) {
    setKategoriList((prev) => prev.map((k, i) => (i === idx ? { ...k, ...patch } : k)));
  }
  function removeKategori(idx: number) {
    setKategoriList((prev) => prev.filter((_, i) => i !== idx));
  }
  function addKategori() {
    setKategoriList((prev) => [...prev, { label: "", unit: "TIM" }]);
  }

  async function handleSave(data: FormData) {
    const toastId = toast.loading("Menyimpan...");
    const result = await saveKonfigVoting(data);
    if (result.success) {
      if (result.message) toast.warning(result.message, { id: toastId, duration: 6000 });
      else toast.success("Konfigurasi disimpan!", { id: toastId });
    } else {
      toast.error(result.message ?? "Gagal menyimpan", { id: toastId });
    }
  }

  return (
    <form
      action={handleSave}
      className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col gap-4"
    >
      <h3 className="font-semibold text-lg">Konfigurasi Voting Dukungan</h3>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="aktif"
          defaultChecked={konfig?.aktif ?? true}
          className="w-4 h-4"
        />
        Buka voting untuk publik
      </label>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Mulai (opsional)</label>
          <input
            type="datetime-local"
            name="mulaiPada"
            defaultValue={konfig?.mulaiPada ? toDatetimeLocal(new Date(konfig.mulaiPada)) : ""}
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Tutup (opsional)</label>
          <input
            type="datetime-local"
            name="tutupPada"
            defaultValue={konfig?.tutupPada ? toDatetimeLocal(new Date(konfig.tutupPada)) : ""}
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>
      <p className="text-xs text-gray-400 -mt-2">
        Kosongkan kalau tidak mau pakai jadwal — voting cuma dikontrol toggle &quot;Buka voting&quot; di atas. Kalau diisi, halaman /vote menampilkan countdown dan otomatis tertutup begitu waktunya lewat.
      </p>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Nominal per Dukungan (Rp)</label>
        <input
          name="nominalVote"
          type="number"
          min={0}
          defaultValue={konfig?.nominalVote ?? 5000}
          required
          className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Gambar QRIS</label>
        <p className="text-xs text-gray-400 -mt-1">
          QRIS dukungan pakai gambar yang sama dengan Tiket & Galeri Foto Premium — atur/ganti di{" "}
          <Link href="/admin/tiket" className="text-primary-600 hover:underline">
            Pengaturan Pembayaran Tiket
          </Link>
          , bukan di sini.
        </p>
        {qrisUrlTiket ? (
          <Image
            src={qrisUrlTiket}
            alt="QRIS"
            width={160}
            height={160}
            className="rounded-lg border border-neutral-200 object-contain"
          />
        ) : (
          <p className="text-xs text-amber-600">Belum ada QRIS diupload di halaman Tiket.</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Nama Bank (opsional, untuk referensi admin)</label>
        <input
          name="bankNama"
          defaultValue={konfig?.bankNama ?? ""}
          placeholder="BCA / BRI / Mandiri / BNI..."
          className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Nomor Rekening</label>
        <input
          name="bankNoRek"
          defaultValue={konfig?.bankNoRek ?? ""}
          placeholder="1440027643102"
          className="border border-neutral-300 rounded-lg px-3 py-2 text-sm font-mono"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Atas Nama</label>
        <input
          name="bankAtasNama"
          defaultValue={konfig?.bankAtasNama ?? ""}
          placeholder="Nama Pemilik Rekening"
          className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4">
        <label className="text-sm font-medium">Kategori Dukungan Tambahan</label>
        <p className="text-xs text-gray-400 -mt-1">
          &quot;Tim Favorit&quot; selalu ada bawaan. Tambahkan kategori lain di sini (mis. Pelatih Terbaik,
          Danton Terbaik) — pilih apa yang ditampilkan/dipilih pendukung untuk kategori itu.
        </p>
        {kategoriList.map((k, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              name="kategoriLabel"
              value={k.label}
              onChange={(e) => updateKategori(idx, { label: e.target.value })}
              placeholder="Pelatih Terbaik"
              className="flex-1 border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            />
            <select
              name="kategoriUnit"
              value={k.unit}
              onChange={(e) => updateKategori(idx, { unit: e.target.value as KategoriVoting["unit"] })}
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            >
              {(Object.keys(UNIT_LABEL) as KategoriVoting["unit"][]).map((u) => (
                <option key={u} value={u}>{UNIT_LABEL[u]}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeKategori(idx)}
              className="text-red-500 text-sm font-semibold px-2"
            >
              Hapus
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addKategori}
          className="self-start text-primary-600 text-sm font-semibold hover:underline"
        >
          + Tambah Kategori
        </button>
      </div>

      <button
        type="submit"
        className="bg-primary-500 text-white rounded-lg py-2 text-sm font-semibold hover:bg-primary-600 transition-colors"
      >
        Simpan Konfigurasi
      </button>
    </form>
  );
}
