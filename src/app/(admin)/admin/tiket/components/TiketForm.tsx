"use client";

import { createTiketAdmin } from "@/actions/Tiket";
import SubmitButton from "@/app/components/global/SubmitButton";
import TextField from "@/app/components/global/Input";
import { toast } from "sonner";

export default function TiketForm() {
  async function handleCreate(data: FormData) {
    const toastId = toast.loading("Menyimpan...");
    const result = await createTiketAdmin(data);
    if (result.success) {
      toast.success("Tiket berhasil ditambahkan!", { id: toastId });
    } else {
      toast.error("Gagal menambahkan tiket", { id: toastId });
    }
  }

  return (
    <form
      action={handleCreate}
      className="bg-white rounded-xl border border-neutral-200 p-6 flex flex-col gap-4 max-w-lg"
    >
      <h3 className="font-semibold text-lg">Tambah Jenis Tiket</h3>
      <TextField
        id="jenis"
        name="jenis"
        label="Jenis Tiket"
        placeholder="Contoh: Reguler / VIP / Supporter"
        type="text"
        required
      />
      <TextField
        id="harga"
        name="harga"
        label="Harga (Rp)"
        placeholder="10000"
        type="number"
        required
      />
      <TextField
        id="kuota"
        name="kuota"
        label="Kuota"
        placeholder="100"
        type="number"
        required
      />
      <div className="flex flex-col gap-2">
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input type="checkbox" name="khususTim" className="mt-1" />
          <span>
            <span className="font-medium">Tiket wajib tim</span>
            <span className="block text-xs text-neutral-500">
              Hanya bisa dibeli online oleh akun tim yang sedang login, satu kali per tim, dengan jumlah di bawah.
            </span>
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm pl-6">
          Jumlah per tim
          <input
            name="jumlahPerTim"
            type="number"
            min={1}
            defaultValue={1}
            className="border border-neutral-200 rounded-lg px-2 py-1 text-sm w-20"
          />
          <span className="text-xs text-neutral-500">tiket (hanya untuk tiket wajib tim)</span>
        </label>
      </div>
      <div className="border-t border-neutral-100 pt-4 flex flex-col gap-3">
        <div>
          <p className="font-medium text-sm">Bundling (opsional)</p>
          <p className="text-xs text-neutral-500">
            Contoh: tambah Rp5.000 dapat &quot;2 Air Minum&quot;. Kosongkan jika tidak ada bundling.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            id="bundleHarga"
            name="bundleHarga"
            label="Harga Tambahan (Rp)"
            placeholder="5000"
            type="number"
          />
          <TextField
            id="bundleIsi"
            name="bundleIsi"
            label="Isi Bundling"
            placeholder="2 Air Minum"
            type="text"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <SubmitButton text="Tambah Tiket" />
      </div>
    </form>
  );
}
