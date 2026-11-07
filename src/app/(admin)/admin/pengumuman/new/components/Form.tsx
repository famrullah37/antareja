"use client";

import SubmitButton from "@/app/components/global/SubmitButton";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createPengumumanForm } from "@/actions/Pengumuman";
import type { Pengumuman } from "@prisma/client";

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
