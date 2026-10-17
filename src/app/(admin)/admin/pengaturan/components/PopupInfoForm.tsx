"use client";

import { savePopupInfo } from "@/actions/KonfigUmum";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  popupAktif: boolean;
  popupJudul: string | null;
  popupIsi: string | null;
  popupTampilKuota: boolean;
};

export default function PopupInfoForm({ konfig }: { konfig: Props }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function simpan(data: FormData) {
    setBusy(true);
    const result = await savePopupInfo(data);
    setBusy(false);
    if (result.success) {
      toast.success(result.message);
      router.refresh();
    } else toast.error(result.message);
  }

  return (
    <form action={simpan} className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col gap-4 max-w-2xl">
      <h2 className="font-semibold text-lg">Popup Informasi Beranda</h2>
      <p className="text-sm text-gray-500">
        Muncul sekali saat pengunjung membuka halaman utama (muncul lagi di sesi browser berikutnya, atau langsung
        setelah isi popup diubah). Sisa kuota dihitung otomatis dari tim terkonfirmasi per jenjang aktif, beserta
        batas penutupan pendaftaran kalau sudah diisi.
      </p>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="popupAktif" defaultChecked={konfig.popupAktif} className="w-4 h-4" />
        Tampilkan popup saat halaman utama dibuka
      </label>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="popupTampilKuota" defaultChecked={konfig.popupTampilKuota} className="w-4 h-4" />
        Sertakan sisa kuota per jenjang & batas pendaftaran
      </label>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Judul</label>
        <input
          type="text"
          name="popupJudul"
          maxLength={120}
          defaultValue={konfig.popupJudul ?? ""}
          placeholder="mis. Pendaftaran Antareja Dibuka!"
          className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Isi</label>
        <textarea
          name="popupIsi"
          rows={5}
          maxLength={2000}
          defaultValue={konfig.popupIsi ?? ""}
          placeholder="Informasi bebas: jadwal technical meeting, syarat, kontak panitia, dst. Baris baru ikut tampil."
          className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="self-start bg-primary-500 text-white rounded-lg py-2 px-5 text-sm font-semibold hover:bg-primary-600 disabled:opacity-60 transition-colors"
      >
        {busy ? "Menyimpan..." : "Simpan Popup"}
      </button>
    </form>
  );
}
