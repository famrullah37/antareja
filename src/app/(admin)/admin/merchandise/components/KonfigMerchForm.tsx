"use client";

import { saveKonfigMerch } from "@/actions/Merchandise";
import SubmitButton from "@/app/components/global/SubmitButton";
import { poTerbuka } from "@/lib/merchandise";
import { toast } from "sonner";

type Konfig = {
  poAktif: boolean;
  tutupPada: Date | null;
  infoPengambilan: string | null;
  readyAktif: boolean;
} | null;

// Tampilkan dalam WIB (server simpan UTC, input datetime-local tanpa zona).
function toWibDatetimeLocal(d: Date) {
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 16);
}

export default function KonfigMerchForm({ konfig }: { konfig: Konfig }) {
  async function handleSubmit(data: FormData) {
    const toastId = toast.loading("Menyimpan...");
    const result = await saveKonfigMerch(data);
    if (result.success) toast.success("Pengaturan PO disimpan", { id: toastId });
    else toast.error(result.message ?? "Gagal menyimpan", { id: toastId });
  }

  return (
    <form action={handleSubmit} className="bg-white rounded-xl border border-neutral-200 p-6 flex flex-col gap-4 max-w-2xl">
      <h3 className="font-semibold text-lg">Pengaturan Pre-Order</h3>
      {/* Status sebenarnya: centang "PO aktif" adalah saklar manual, sedangkan
          batas akhir menutup PO otomatis tanpa mengubah centang. */}
      {(() => {
        const terbuka = poTerbuka(konfig ? { poAktif: konfig.poAktif, tutupPada: konfig.tutupPada ? new Date(konfig.tutupPada) : null } : null);
        const lewatBatas = !!konfig?.poAktif && !terbuka;
        return (
          <div
            className={`rounded-lg px-3 py-2 text-sm border ${
              terbuka ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            Status saat ini: <b>{terbuka ? "PO TERBUKA" : "PO DITUTUP"}</b>
            {lewatBatas && " — otomatis tertutup karena sudah lewat batas akhir. Pembeli tidak bisa memesan."}
            {terbuka && konfig?.tutupPada && " — akan tertutup otomatis saat batas akhir tercapai."}
          </div>
        );
      })()}
      <label className="flex items-center gap-3 text-sm font-medium">
        <input type="checkbox" name="poAktif" defaultChecked={konfig?.poAktif ?? false} className="w-4 h-4 accent-primary-500" />
        Buka pemesanan (PO aktif)
      </label>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="tutupPada">
          Batas Akhir PO (WIB) <span className="text-gray-400 font-normal">— opsional</span>
        </label>
        <input
          id="tutupPada"
          type="datetime-local"
          name="tutupPada"
          defaultValue={konfig?.tutupPada ? toWibDatetimeLocal(new Date(konfig.tutupPada)) : ""}
          className="border border-neutral-300 rounded-lg px-3 py-2 text-sm w-fit"
        />
      </div>
      <div className="border-t border-neutral-100 pt-4 flex flex-col gap-1">
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" name="readyAktif" defaultChecked={konfig?.readyAktif ?? false} className="w-4 h-4 accent-primary-500" />
          Jual ready stock saat PO ditutup
        </label>
        <p className="text-xs text-gray-500 ml-7">
          Pembeli bisa membeli dari stok ready (isi di kartu produk → Stok Ready). Pilihan kirim: ongkir dikonfirmasi
          admin dulu; ambil sendiri: langsung bayar. Batas bayar 2×24 jam, lewat → batal &amp; stok kembali.
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="infoPengambilan">
          Info Pengambilan / Estimasi Jadi
        </label>
        <textarea
          id="infoPengambilan"
          name="infoPengambilan"
          rows={3}
          defaultValue={konfig?.infoPengambilan ?? ""}
          placeholder="Contoh: Merchandise diambil saat hari lomba, 14 November 2026, di stan panitia SMK Telkom Malang."
          className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
        />
        <p className="text-xs text-gray-400">Tampil di halaman merchandise & email konfirmasi.</p>
      </div>
      <p className="text-xs text-gray-500">
        Rekening & QRIS pembayaran memakai konfigurasi yang sama dengan Tiket.
      </p>
      <div className="flex justify-end">
        <SubmitButton text="Simpan" />
      </div>
    </form>
  );
}
