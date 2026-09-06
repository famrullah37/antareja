"use client";

import { saveKonfigUmum } from "@/actions/KonfigUmum";
import { toast } from "sonner";

type Konfig = {
  countdownTarget: Date;
  countdownAktif: boolean;
  pendaftaranDeadline: Date | null;
  biayaSD: number;
  biayaSDDP: number;
  biayaSMP: number;
  biayaSMPDP: number;
  biayaSMA: number;
  biayaSMADP: number;
  bankNama: string | null;
  bankNoRek: string | null;
  bankAtasNama: string | null;
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
      {/* Countdown / Coming Soon */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col gap-4">
        <h2 className="font-semibold text-lg">Countdown & Coming Soon</h2>
        <p className="text-sm text-gray-500">
          Selama belum diaktifkan, halaman utama akan menampilkan halaman{" "}
          <strong>Coming Soon</strong> untuk pengunjung (admin tetap bisa login &
          masuk ke dashboard seperti biasa). Setelah diaktifkan, halaman utama akan
          otomatis terbuka sendiri tepat saat waktu target tercapai.
        </p>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="countdownAktif"
            defaultChecked={konfig.countdownAktif}
            className="w-4 h-4"
          />
          Aktifkan countdown (buka situs otomatis pada waktu target)
        </label>
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

      {/* Penutupan Pendaftaran */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col gap-4">
        <h2 className="font-semibold text-lg">Penutupan Pendaftaran</h2>
        <p className="text-sm text-gray-500">
          Tanggal ini yang ditampilkan sebagai countdown "Penutupan Pendaftaran" di
          Hero halaman utama — <strong>berbeda</strong> dari "Target Waktu" di atas
          (itu untuk gerbang peluncuran situs/Coming Soon). Kosongkan kalau belum
          mau menampilkan countdown pendaftaran.
        </p>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Tutup Pendaftaran (opsional)</label>
          <input
            type="datetime-local"
            name="pendaftaranDeadline"
            defaultValue={konfig.pendaftaranDeadline ? toDatetimeLocal(new Date(konfig.pendaftaranDeadline)) : ""}
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="self-start bg-primary-500 text-white rounded-lg py-2 px-6 text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          Simpan
        </button>
      </div>

      {/* Rekening Pendaftaran */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col gap-4">
        <h2 className="font-semibold text-lg">Rekening Pendaftaran</h2>
        <p className="text-sm text-gray-500">
          Rekening yang ditampilkan di form pendaftaran tim (/form) untuk transfer biaya pendaftaran.
        </p>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Nama Bank</label>
          <input
            name="bankNama"
            defaultValue={konfig.bankNama ?? ""}
            placeholder="Bank Mandiri"
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Nomor Rekening</label>
          <input
            name="bankNoRek"
            defaultValue={konfig.bankNoRek ?? ""}
            placeholder="1440027643102"
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm font-mono"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Atas Nama</label>
          <input
            name="bankAtasNama"
            defaultValue={konfig.bankAtasNama ?? ""}
            placeholder="Nama Pemilik Rekening"
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
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
