"use client";

import { hapusDokumenPeserta, uploadDokumenPeserta } from "@/actions/DokumenPeserta";
import {
  DOKUMEN_JENIS,
  DOKUMEN_JENJANG,
  dokumenUrl,
  type DokumenJenis,
  type DokumenKey,
  type DokumenPeserta,
} from "@/lib/dokumenPeserta";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

function SlotDokumen({ dokumenKey, label, dokumen }: { dokumenKey: DokumenKey; label: string; dokumen: DokumenPeserta }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const info = dokumen[dokumenKey];

  async function upload(data: FormData) {
    setBusy(true);
    const toastId = toast.loading("Mengupload...");
    const result = await uploadDokumenPeserta(dokumenKey, data);
    setBusy(false);
    if (result.success) {
      toast.success(result.message, { id: toastId });
      formRef.current?.reset();
      router.refresh();
    } else toast.error(result.message, { id: toastId });
  }

  async function hapus() {
    if (!confirm(`Hapus ${label}? Peserta tidak bisa mengunduhnya lagi.`)) return;
    setBusy(true);
    const result = await hapusDokumenPeserta(dokumenKey);
    setBusy(false);
    if (result.success) {
      toast.success(result.message);
      router.refresh();
    } else toast.error(result.message);
  }

  return (
    <form ref={formRef} action={upload} className="flex flex-col gap-2 border border-neutral-200 rounded-lg p-4">
      <span className="text-sm font-medium">{label}</span>
      {info ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <a href={dokumenUrl(dokumenKey, info)} className="text-primary-600 hover:underline break-all">
            {info.nama}
          </a>
          <button type="button" onClick={hapus} disabled={busy} className="text-gray-400 hover:text-red-600 disabled:opacity-60">
            Hapus
          </button>
        </div>
      ) : (
        <span className="text-xs text-gray-400">Belum ada file — tombol unduh tidak muncul di dashboard peserta.</span>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <input
          type="file"
          name="file"
          accept=".pdf,.doc,.docx"
          required
          className="flex-1 text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100"
        />
        <button
          type="submit"
          disabled={busy}
          className="self-start bg-primary-500 text-white rounded-lg py-2 px-5 text-sm font-semibold hover:bg-primary-600 disabled:opacity-60 transition-colors"
        >
          {busy ? "Memproses..." : info ? "Ganti" : "Upload"}
        </button>
      </div>
    </form>
  );
}

export default function DokumenPesertaForm({ dokumen }: { dokumen: DokumenPeserta }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col gap-4 max-w-2xl">
      <h2 className="font-semibold text-lg">Surat Undangan & Rekomendasi</h2>
      <p className="text-sm text-gray-500">
        File (PDF atau Word) yang bisa diunduh peserta di dashboard, sesuai jenjang timnya. Disimpan di server,
        bukan Cloudinary.
      </p>
      {(Object.keys(DOKUMEN_JENIS) as DokumenJenis[]).map((jenis) => (
        <div key={jenis} className="flex flex-col gap-3">
          <h3 className="font-semibold text-sm">{DOKUMEN_JENIS[jenis]}</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {DOKUMEN_JENJANG.map((jenjang) => (
              <SlotDokumen
                key={jenjang}
                dokumenKey={`${jenis}-${jenjang}`}
                label={`${DOKUMEN_JENIS[jenis]} ${jenjang}`}
                dokumen={dokumen}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
