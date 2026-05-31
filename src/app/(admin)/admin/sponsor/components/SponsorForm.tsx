"use client";

import { createSponsorForm } from "@/actions/Sponsor";
import { useRouter } from "next-nprogress-bar";
import { useRef, useState } from "react";
import { toast } from "sonner";

const TIPE_OPTIONS = [
  { value: "SPONSOR", label: "Sponsor" },
  { value: "MEDIA_PARTNER", label: "Media Partner" },
  { value: "SUPPORT_BY", label: "Support By" },
];

export default function SponsorForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleSubmit(data: FormData) {
    setLoading(true);
    const toastId = toast.loading("Mengunggah...");
    const result = await createSponsorForm(data);
    setLoading(false);
    if (result.success) {
      toast.success("Sponsor berhasil ditambahkan", { id: toastId });
      formRef.current?.reset();
      setPreview(null);
      router.refresh();
    } else {
      toast.error(result.message ?? "Gagal menambahkan sponsor", { id: toastId });
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6">
      <h2 className="font-semibold text-lg mb-4">Tambah Sponsor / Media Partner</h2>
      <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Nama</label>
            <input
              name="nama"
              required
              placeholder="Nama sponsor"
              className="border border-neutral-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Link URL (opsional)</label>
            <input
              name="linkUrl"
              type="url"
              placeholder="https://contoh.com"
              className="border border-neutral-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Tipe</label>
            <select
              name="tipe"
              defaultValue="SPONSOR"
              className="border border-neutral-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              {TIPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Urutan tampil</label>
            <input
              name="urutan"
              type="number"
              defaultValue={0}
              min={0}
              className="border border-neutral-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            Logo <span className="text-red-500">*</span>
            <span className="text-xs text-gray-400 font-normal ml-1">PNG/SVG transparan direkomendasikan</span>
          </label>
          <input
            name="logo"
            type="file"
            accept="image/*"
            required
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPreview(URL.createObjectURL(file));
              else setPreview(null);
            }}
            className="border border-neutral-200 py-2.5 px-3 rounded-xl text-sm file:bg-primary-500 file:text-white file:rounded-md file:border-none file:py-1 file:px-3 hover:cursor-pointer"
          />
          {preview && (
            <div className="mt-2 bg-neutral-100 rounded-xl p-4 flex items-center justify-center h-24">
              <img src={preview} alt="preview" className="max-h-full max-w-[200px] object-contain" />
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-primary-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-60"
          >
            {loading ? "Menyimpan..." : "Tambah Sponsor"}
          </button>
        </div>
      </form>
    </div>
  );
}
