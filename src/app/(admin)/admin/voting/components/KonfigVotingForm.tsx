"use client";

import { saveKonfigVoting } from "@/actions/Voting";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

type Konfig = {
  aktif: boolean;
  nominalVote: number;
  qrisUrl?: string | null;
  qrisPayload?: string | null;
  bankNama?: string | null;
  bankNoRek?: string | null;
  bankAtasNama?: string | null;
  mulaiPada?: Date | string | null;
  tutupPada?: Date | string | null;
};

function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function KonfigVotingForm({ konfig }: { konfig: Konfig | null }) {
  const [preview, setPreview] = useState(konfig?.qrisUrl ?? "");

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
        Kosongkan kalau tidak mau pakai jadwal — voting cuma dikontrol toggle "Buka voting" di atas. Kalau diisi, halaman /vote menampilkan countdown dan otomatis tertutup begitu waktunya lewat.
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
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Upload Gambar QRIS</label>
          {konfig?.qrisUrl && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                konfig.qrisPayload ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {konfig.qrisPayload ? "QRIS Dinamis Aktif" : "Kode QRIS Tidak Terbaca"}
            </span>
          )}
        </div>
        {preview && (
          <Image
            src={preview}
            alt="QRIS"
            width={160}
            height={160}
            className="rounded-lg border border-neutral-200 object-contain"
            unoptimized={preview.startsWith("blob:")}
          />
        )}
        <input
          type="file"
          name="qris"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setPreview(URL.createObjectURL(f));
          }}
          className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100"
        />
        <span className="text-xs text-gray-400">Kosongkan jika tidak ingin mengubah gambar</span>
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

      <button
        type="submit"
        className="bg-primary-500 text-white rounded-lg py-2 text-sm font-semibold hover:bg-primary-600 transition-colors"
      >
        Simpan Konfigurasi
      </button>
    </form>
  );
}
