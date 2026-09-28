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
