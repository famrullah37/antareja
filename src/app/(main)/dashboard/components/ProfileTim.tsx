"use client";

import { ReactNode, useState } from "react";
import { H2, H3, P } from "@/app/components/global/Text";
import SectionWrapper from "@/app/components/global/Wrapper";
import { TimWithRelations } from "@/types/entityRelations";
import { AnggotaCard } from "./parts/AnggotaCard";
import cn from "@/lib/clsx";
import { updateTimForm } from "@/actions/Tim";
import TextField from "@/app/components/global/Input";
import Field from "../components/parts/input";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import SubmitButton from "@/app/components/global/SubmitButton";

const rowsMapNormal = [
  ["b1s1", "b1s2", "b1s3"],
  ["b2s1", "b2s2", "b2s3"],
  ["b3s1", "b3s2", "b3s3"],
  ["b4s1", "b4s2", "b4s3"],
  ["b5s1", "b5s2", "b5s3"],
];
const rowsMapSmall = [
  ["b1s1", "b1s2", "b1s3"],
  ["b2s1", "b2s2", "b2s3"],
  ["b3s1", "b3s2", "b3s3"],
  ["b4s1", "b4s2", "b4s3"],
];
const sizeMap = {
  SMALL: 12,
  NORMAL: 15,
};

function AnggotaCardsWrapper({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <div className={cn("flex items-center justify-center gap-16 ", className)}>
      {children}
    </div>
  );
}

function TimLayout({ tim }: Readonly<{ tim: TimWithRelations }>) {
  const [anggotas] = useState(tim.anggotas);
  const [danton] = useState(
    tim.anggotas.find((value) => value.posisi === "DANTON")
  );
  const [official] = useState(
    tim.anggotas.find((value) => value.posisi === "OFFICIAL")
  );
  const [pelatih] = useState(
    tim.anggotas.find((value) => value.posisi === "PELATIH")
  );

  return (
    <div className="block">
      <H3
        className={`${anggotas.length !== sizeMap[tim.tipe_tim] ? "" : "mb-4"}`}
      >
        Anggota Tim ({sizeMap[tim.tipe_tim]} Pasukan + Danton + Official + Pelatih)
      </H3>
      {anggotas.length !== sizeMap[tim.tipe_tim] + 3 && (
        <P className="text-yellow-600 mb-4 animate-pulse">
          (Data belum lengkap)
        </P>
      )}
      <div className="py-16 px-10 bg-neutral-300 rounded-lg flex flex-col gap-12">
        <AnggotaCardsWrapper className="flex flex-wrap gap-10">
          <AnggotaCard
            href={`/dashboard/anggota/pelatih?timId=${tim.id}`}
            image={pelatih?.foto ?? "/placeholder-profile-picture.jpg"}
            name={tim.pelatih ?? "Belum diisi"}
            key={"pelatih"}
            posisi={pelatih?.posisi ?? "PELATIH"}
          />
          <AnggotaCard
            href={`/dashboard/anggota/danton?timId=${tim.id}`}
            image={danton?.foto ?? "/placeholder-profile-picture.jpg"}
            name={danton?.nama ?? "Belum diisi"}
            key={"danton"}
            posisi={danton?.posisi ?? "DANTON"}
          />
          <AnggotaCard
            href={`/dashboard/anggota/official?timId=${tim.id}`}
            image={official?.foto ?? "/placeholder-profile-picture.jpg"}
            name={official?.nama ?? "Belum diisi"}
            key={"official"}
            posisi={official?.posisi ?? "OFFICIAL"}
          />
        </AnggotaCardsWrapper>
        {tim.tipe_tim === "NORMAL"
          ? rowsMapNormal.map((row, i) => (
            <AnggotaCardsWrapper
              key={"n" + i}
              className="flex flex-wrap gap-10"
            >
              {row.map((pos, i) => {
                const anggotaInPos = anggotas.find(
                  (value) => value.posisi === pos.toUpperCase()
                );
                return (
                  <AnggotaCard
                    href={`/dashboard/anggota/${pos}?timId=${tim.id}`}
                    image={anggotaInPos?.foto ?? "/placeholder-profile-picture.jpg"}
                    name={anggotaInPos?.nama ?? "Belum diisi"}
                    posisi={"Posisi " + (anggotaInPos?.posisi ?? pos)}
                    key={anggotaInPos?.id ?? i}
                  />
                );
              })}
            </AnggotaCardsWrapper>
          ))
          : rowsMapSmall.map((row, i) => (
            <AnggotaCardsWrapper
              key={"s" + i}
              className="flex flex-wrap gap-10"
            >
              {row.map((pos, i) => {
                const anggotaInPos = anggotas.find(
                  (value) => value.posisi === pos.toUpperCase()
                );
                return (
                  <AnggotaCard
                    href={`/dashboard/anggota/${pos}?timId=${tim.id}`}
                    image={anggotaInPos?.foto ?? "/placeholder-profile-picture.jpg"}
                    name={anggotaInPos?.nama ?? "Belum diisi"}
                    posisi={anggotaInPos?.posisi ?? pos}
                    key={anggotaInPos?.id ?? i}
                  />
                );
              })}
            </AnggotaCardsWrapper>
          ))}
      </div>
    </div>
  );
}

export default function ProfileTim({ tim, penilaian }: { tim: TimWithRelations; penilaian?: any }) {
  const router = useRouter();

  async function submitForm(formData: FormData) {
    const toastId = toast.loading(
      tim.link_berkas === "" ? "Membuat link..." : "Memperbarui link..."
    );
    const result = await updateTimForm(tim.id, formData);

    if ("message" in result) {
      if (result.success) {
        toast.success(result.message, { id: toastId });
        router.refresh();
      } else {
        toast.error(result.message, { id: toastId });
      }
    } else {
      toast.error("An error occurred", { id: toastId });
    }
  }

  return (
    <SectionWrapper id="profile-tim">
      <H2 className="mb-2">Profil Tim Anda</H2>
      <div className="w-full bg-white rounded-lg p-5">
        {/* --- info tim --- */}
        <div className="flex flex-col gap-1 mb-4">
          <H3>Nama Tim</H3>
          <P>{tim.nama_tim}</P>
        </div>

        {tim.confirmed ? (
          <form action={submitForm} className="mb-4">
            <H3 className="mb-4">Foto Tim</H3>
            <P className="text-sm text-gray-500 mb-2">
              Ditampilkan di halaman Vote (/vote) supaya pendukung mudah mengenali timmu.
            </P>
            <div className="flex items-center gap-4 mb-4">
              {tim.foto ? (
                <img
                  src={tim.foto}
                  alt={tim.nama_tim}
                  className="w-20 h-20 rounded-full object-cover border border-neutral-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary-100 text-primary-600 font-bold flex items-center justify-center border border-neutral-200">
                  {tim.nama_tim.slice(0, 2).toUpperCase()}
                </div>
              )}
              <input
                name="foto"
                type="file"
                accept="image/*"
                className="text-sm file:bg-primary-500 file:text-white file:rounded-md file:border-none file:py-1.5 file:px-3 file:mr-3 hover:cursor-pointer"
              />
            </div>
            <H3 className="mb-4">Video Tiktok + Foto Pasukan</H3>
            <TextField
              id="link_video"
              name="link_video"
              placeholder="Masukkan link drive video tiktok + foto pasukan"
              type="url"
              className="w-full mb-4"
              value={tim.link_video ?? ""}
            />
            <H3 className="mb-4">Link Berkas</H3>
            <TextField
              id="link_berkas"
              name="link_berkas"
              placeholder="Masukkan link drive..."
              type="url"
              className="w-full"
              value={tim.link_berkas ?? ""}
            />
            <div className="w-full justify-end flex mt-4">
              <SubmitButton text={"Submit"} className="float-end mt-4" />
            </div>
          </form>
        ) : null}

        {/* hasil penilaian (legacy) */}
        {penilaian?.published === true && (
          <>
            <div className="flex flex-col gap-1 mb-4">
              <H3 className="pb-4">Hasil Penilaian</H3>
              <Field
                id="link_penilaian"
                label="Link Penilaian"
                placeholder="Masukkan link penilaian"
                type="url"
                name="link_penilaian"
                value={penilaian.detail_url}
                disabled={true}
              />
            </div>
            <div className="flex flex-col gap-1 mb-4">
              <H3 className="pb-4">Catatan Juri</H3>
              <Field
                id="note"
                label="Note"
                placeholder="Masukkan note"
                type="text"
                name="note"
                value={penilaian.note}
                disabled={true}
              />
            </div>
          </>
        )}

        {tim.confirmed ? (
          <TimLayout tim={tim} />
        ) : (
          <SectionWrapper className="!pt-[100px] flex items-center justify-center">
            <H3 className="text-center">
              Silahkan untuk menunggu konfirmasi pembayaran dari admin
            </H3>
          </SectionWrapper>
        )}
      </div>
    </SectionWrapper>
  );
}
