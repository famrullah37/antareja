"use client";

import SubmitButton from "@/app/components/global/SubmitButton";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createPengumumanForm } from "@/actions/Pengumuman";
import type { Pengumuman } from "@prisma/client";
import { TIPE_PENGUMUMAN } from "@/lib/pengumuman";

export default function UserForm({ data }: { data?: Pengumuman }) {
  const router = useRouter();
  async function Create(data: FormData) {
    const toastId = toast.loading("Menyimpan pengumuman...");
    const result = await createPengumumanForm(data);
    if (!result.success) {
      toast.error("Gagal menambahkan pengumuman! Pastikan isinya tidak kosong.", { id: toastId });
    } else {
      toast.success("Berhasil menambahkan pengumuman!", { id: toastId });
      // redirect() dari next/navigation tidak didukung di handler sisi klien (Next 14).
      router.push("/admin/pengumuman");
      router.refresh();
    }
  }

  return (
    <form action={Create}>
      <div className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-[16px] mb-2">Tipe Pengumuman</legend>
          <div className="grid sm:grid-cols-2 gap-3">
            {TIPE_PENGUMUMAN.map((t) => (
              <label
                key={t.key}
                className="flex items-start gap-3 border border-[#E4E6EA] rounded-[14px] p-4 cursor-pointer has-[:checked]:border-primary-400 has-[:checked]:bg-primary-50"
              >
                <input
                  type="radio"
                  name="tipe"
                  value={t.key}
                  required
                  defaultChecked={(data?.tipe ?? "SEBELUM") === t.key}
                  className="mt-1"
                />
                <span>
                  <span className="block font-semibold">{t.label}</span>
                  <span className="block text-sm text-gray-500">{t.keterangan}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {/* Multi-baris: pengumuman (mis. daftar juara per jenjang) tampil dengan baris baru di dashboard peserta. */}
        <div className="flex flex-col gap-2">
          <label htmlFor="content" className="text-[16px]">
            Isi Pengumuman
          </label>
          <textarea
            id="content"
            name="content"
            rows={8}
            maxLength={3000}
            required
            defaultValue={data?.content}
            placeholder={"Contoh:\nJuara Umum SMP: SMP-07\nJuara Utama 1 SMP: SMP-02"}
            className="bg-[#FAFAFA] border focus:outline-none border-[#E4E6EA] rounded-[14px] text-black py-[18px] px-[20px] text-[16px] focus:bg-[#F1F6F9] transition-all duration-500 placeholder:text-[#C8C8C8]"
          />
        </div>
      </div>
      <div className="float-end mt-3">
        <SubmitButton text="Create" />
      </div>
    </form>
  );
}
