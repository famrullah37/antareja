"use client";

import { upsertAnggotaForm } from "@/actions/Anggota";
import TextField from "@/app/components/global/Input";
import SubmitButton from "@/app/components/global/SubmitButton";
import { H2 } from "@/app/components/global/Text";
import { Anggota, Kelas, Tim } from "@prisma/client";
import { useRouter } from "next/navigation";
import Select from "react-select";
import { toast } from "sonner";

const kelas: { label: Kelas; value: Kelas }[] = [
  { label: "XII", value: "XII" },
  { label: "XI", value: "XI" },
  { label: "X", value: "X" },
  { label: "IX", value: "IX" },
  { label: "VIII", value: "VIII" },
  { label: "VII", value: "VII" },
  { label: "VI", value: "VI" },
  { label: "V", value: "V" },
  { label: "IV", value: "IV" },
  { label: "III", value: "III" },
  { label: "II", value: "II" },
  { label: "I", value: "I" },
];

export default function EditAnggotaForm({
  anggota,
  tim,
}: Readonly<{ anggota: Anggota; tim: Tim }>) {
  const router = useRouter();

  async function submitForm(data: FormData) {
    const toastId = toast.loading(
      anggota.id === "" ? "Membuat anggota..." : "Memperbarui anggota..."
    );
    const result = await upsertAnggotaForm(data, anggota.posisi, anggota.id, anggota.timId);

    if (result.success) {
      toast.success(result.message, { id: toastId });
      router.push(`/dashboard?timId=${anggota.timId}`);
    } else {
      toast.error(result.message, { id: toastId });
    }
  }

  return (
    <form className="mx-[20px] md:mx-[100px] my-[24px]" action={submitForm}>
      <H2>
        {anggota.id === ""
          ? `Buat Posisi ${anggota.posisi.toUpperCase()}`
          : `Edit Posisi ${anggota.posisi.toUpperCase()}`}
      </H2>

      <div className="flex flex-col gap-4 mt-4">
        {/* === Nama === */}
        <TextField
          id="nama"
          name="nama"
          placeholder="Masukkan nama"
          type="text"
          className="w-full"
          value={
            anggota.posisi === "PELATIH" ? tim?.pelatih : anggota.nama
          }
          label="Nama"
          required
        />

        {/* === Email === */}
        <TextField
          id="email"
          name="email"
          placeholder="Masukkan email"
          type="email"
          className="w-full"
          value={anggota.email}
          label="Email"
          required
        />

        {/* === Nomor Telepon === */}
        <TextField
          id="telp"
          name="telp"
          placeholder="Masukkan nomor telepon"
          type="tel"
          className="w-full"
          value={
            anggota.posisi === "PELATIH" ? tim?.no_pelatih ?? "" : anggota.telp
          }
          label="Nomor Telepon"
          required
        />

        {/* === NISN (hanya untuk siswa) === */}
        {anggota.posisi !== "OFFICIAL" && anggota.posisi !== "PELATIH" && (
          <TextField
            id="nisn"
            name="nisn"
            placeholder="Masukkan NISN"
            type="text"
            className="w-full"
            value={anggota.nisn ?? ""}
            label="NISN"
            required
          />
        )}

        {/* === Link IG (khusus pelatih) === */}
        {anggota.posisi === "PELATIH" && (
          <TextField
            id="link_ig"
            name="link_ig"
            placeholder="Masukkan link Instagram"
            type="url"
            className="w-full"
            value={anggota.link_ig ?? ""}
            label="Link Instagram"
            required
          />
        )}

        {/* === Upload Foto === */}
        <div className="flex flex-col gap-2">
          <label htmlFor="foto" className="text-[16px]">
            Pas Foto 3x4 (Max. 10MB)
          </label>
          <input
            type="file"
            className="border border-neutral-200 py-4 px-3 rounded-xl 
                       file:bg-primary-500 file:text-white file:rounded-md 
                       file:border-none file:py-1 hover:file:bg-opacity-85 
                       transition-all duration-300 cursor-pointer"
            title="Pilih foto"
            accept="image/*"
            name="foto"
            required={anggota.id === ""}
          />
        </div>

        {/* === Pilih Kelas (selain pelatih) === */}
        {anggota.posisi !== "PELATIH" && (
          <div className="flex flex-col gap-2">
            <label htmlFor="kelas" className="text-[16px]">
              Kelas
            </label>
            <Select
              name="kelas"
              unstyled
              required
              options={kelas}
              defaultValue={{
                label: anggota.kelas,
                value: anggota.kelas,
              }}
              id="kelas"
              placeholder="Pilih kelas"
              classNames={{
                placeholder: () => "text-[#C8C8C8]",
                control: () =>
                  "rounded-[14px] border focus:bg-[#F1F6F9] border-neutral-400 px-[18px] active:border-black hover:border-black py-[14px] text-black placeholder-neutral-500 bg-white focus:outline-none transition-all duration-500",
                menu: () =>
                  "bg-white rounded-lg px-[18px] py-[14px] border border-neutral-400",
                multiValue: () =>
                  "bg-primary-400 px-4 py-2 text-white rounded-2xl",
                valueContainer: () => "flex gap-2",
                menuList: () => "text-base flex flex-col gap-1",
                option: () =>
                  "hover:bg-neutral-300 hover:cursor-pointer transition-all duration-500 rounded-lg p-2",
                input: () => "focus:bg-[#F1F6F9]",
              }}
            />
          </div>
        )}
      </div>

      <div className="w-full justify-end flex mt-4">
        <SubmitButton
          text={anggota.id === "" ? "Tambah" : "Ubah"}
          className="float-end mt-4"
        />
      </div>
    </form>
  );
}
