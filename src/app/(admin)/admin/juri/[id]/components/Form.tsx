"use client";

import { createJuriForm, updateJuriForm } from "@/actions/Juri";
import TextField from "@/app/components/global/Input";
import SubmitButton from "@/app/components/global/SubmitButton";
import { Juri } from "@prisma/client";
import Image from "next/image";
import { redirect } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

export default function JuriForm({
  data,
  edit,
  id,
}: {
  data?: Juri;
  edit?: boolean;
  id?: string;
}) {
  const [preview, setPreview] = useState<string>(data?.foto ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
  }

  async function Create(formData: FormData) {
    const toastId = toast.loading("Loading...");
    const result = await createJuriForm(formData);
    if (!result.success) {
      toast.error(result.message ?? "Gagal menambahkan juri!", { id: toastId });
    } else {
      toast.success("Berhasil menambahkan juri!", { id: toastId });
      redirect("/admin/juri");
    }
  }

  async function Update(formData: FormData) {
    const toastId = toast.loading("Loading...");
    const result = await updateJuriForm(formData, id!);
    if (!result.success) {
      toast.error(result.message ?? "Gagal mengedit juri!", { id: toastId });
    } else {
      toast.success("Berhasil mengedit juri!", { id: toastId });
      redirect("/admin/juri");
    }
  }

  return (
    <form action={edit ? Update : Create} className="py-5">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-[16px]">Foto Juri</label>
          <div className="flex flex-col items-center gap-4">
            {preview && (
              <Image
                src={preview}
                alt="Preview foto juri"
                width={160}
                height={160}
                className="w-40 h-40 rounded-full object-cover border-2 border-neutral-300"
                unoptimized={preview.startsWith("blob:")}
              />
            )}
            <input
              ref={fileRef}
              type="file"
              name="foto"
              accept="image/*"
              required={!edit}
              onChange={handleFotoChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-primary-400 hover:file:bg-red-100 transition-all"
            />
          </div>
        </div>
        <TextField
          id="nama"
          type="text"
          label="Nama Juri"
          name="nama"
          placeholder="Nama lengkap"
          value={data?.nama}
          required={!edit}
        />
        <TextField
          id="email"
          type="email"
          label="Email"
          name="email"
          placeholder="email@example.com"
          value={data?.email}
          required={!edit}
        />
        <TextField
          id="no_hp"
          type="tel"
          label="No. HP"
          name="no_hp"
          placeholder="08xxxxxxxxxx"
          value={data?.no_hp}
          required={!edit}
        />
      </div>
      <div className="w-full justify-end flex mt-5">
        <SubmitButton text={edit ? "Update" : "Submit"} />
      </div>
    </form>
  );
}
