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
      <div className="flex justify-end">
        <SubmitButton text="Tambah Tiket" />
      </div>
    </form>
  );
}
