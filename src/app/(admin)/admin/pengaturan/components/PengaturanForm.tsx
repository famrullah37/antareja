"use client";

import { saveKonfigUmum } from "@/actions/KonfigUmum";
import { toast } from "sonner";

type Konfig = {
  countdownTarget: Date;
  biayaSD: number;
  biayaSDDP: number;
  biayaSMP: number;
  biayaSMPDP: number;
  biayaSMA: number;
  biayaSMADP: number;
};

function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PengaturanForm({ konfig }: { konfig: Konfig }) {
  async function handleSubmit(data: FormData) {
    const toastId = toast.loading("Menyimpan...");
    const result = await saveKonfigUmum(data);
    if (result.success) toast.success("Pengaturan disimpan!", { id: toastId });
    else toast.error(result.message ?? "Gagal menyimpan", { id: toastId });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-8 max-w-2xl">
      {/* Countdown */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col gap-4">
        <h2 className="font-semibold text-lg">Countdown Registrasi</h2>
        <p className="text-sm text-gray-500">
          Tanggal dan waktu yang dijadikan target hitung mundur di halaman utama.
        </p>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Target Waktu</label>
          <input
            type="datetime-local"
            name="countdownTarget"
            defaultValue={toDatetimeLocal(new Date(konfig.countdownTarget))}
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            required
          />
        </div>
        <button
          type="submit"
          className="self-start bg-primary-500 text-white rounded-lg py-2 px-6 text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          Simpan
        </button>
      </div>

      {/* Biaya Pendaftaran */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col gap-4">
        <h2 className="font-semibold text-lg">Biaya Pendaftaran</h2>
        <p className="text-sm text-gray-500">
          Biaya pendaftaran per jenjang yang ditampilkan di halaman utama dan form pendaftaran.
        </p>

        {[
          { label: "SD / Sederajat – Full", name: "biayaSD", value: konfig.biayaSD },
          { label: "SD / Sederajat – DP 50%", name: "biayaSDDP", value: konfig.biayaSDDP },
          { label: "SMP / Sederajat – Full", name: "biayaSMP", value: konfig.biayaSMP },
          { label: "SMP / Sederajat – DP 50%", name: "biayaSMPDP", value: konfig.biayaSMPDP },
          { label: "SMA / Sederajat – Full", name: "biayaSMA", value: konfig.biayaSMA },
          { label: "SMA / Sederajat – DP 50%", name: "biayaSMADP", value: konfig.biayaSMADP },
        ].map(({ label, name, value }) => (
          <div key={name} className="flex flex-col gap-1">
            <label className="text-sm font-medium">{label}</label>
            <div className="flex items-center border border-neutral-300 rounded-lg overflow-hidden">
              <span className="bg-neutral-100 px-3 py-2 text-sm text-gray-500 border-r border-neutral-300">
                Rp
              </span>
              <input
                type="number"
                name={name}
                defaultValue={value}
                min={0}
                step={1000}
                className="px-3 py-2 text-sm flex-1 outline-none"
                required
              />
            </div>
          </div>
        ))}

        <button
          type="submit"
          className="self-start bg-primary-500 text-white rounded-lg py-2 px-6 text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          Simpan
        </button>
      </div>
    </form>
  );
}
