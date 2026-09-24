"use client";

import { H3, P } from "@/app/components/global/Text";
import { TimWithRelations } from "@/types/entityRelations";
import { ReactNode, useState } from "react";
import { AnggotaCard } from "./parts/AnggotaCard";
import { Posisi } from "@prisma/client";
import Image from "next/image";
import { toDownloadUrl } from "@/lib/downloadUrl";
import { timSlug } from "@/lib/timSlug";

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

function AnggotaCardsWrapper({ children }: Readonly<{ children?: ReactNode }>) {
  return (
    <div className="flex items-center justify-center gap-5 sm:gap-20 flex-wrap">
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

  const tim_id = timSlug(tim);

  return (
    <div className="block mt-5">
      {tim.jenjang === "SMA" ? (
        <H3
          className={`${
            anggotas.length !== sizeMap[tim.tipe_tim] ? "" : "mb-4"
          }`}
        >
          Informasi Anggota ({sizeMap[tim.tipe_tim]} Pasukan + Danton + Official + Pelatih
          )
        </H3>
      ) : (
        <H3
          className={`${
            anggotas.length !== sizeMap[tim.tipe_tim] ? "" : "mb-4"
          }`}
        >
          Informasi Anggota ({sizeMap[tim.tipe_tim]} Pasukan + Danton + Official + Pelatih
          )
        </H3>
      )}

      {anggotas.length !== sizeMap[tim.tipe_tim] + 3 && (
        <P className="text-yellow-600 mb-4 animate-pulse">
          (Data belum lengkap)
        </P>
      )}
      <div className="py-5 right-0 rounded-lg flex flex-col gap-5 sm:gap-12 mb-10">

        <AnggotaCardsWrapper>
          <AnggotaCard
            href={`/admin/tim/${tim_id}/pelatih`}
            image={pelatih?.foto ?? "/placeholder-profile-picture.jpg"}
            name={pelatih?.nama ?? "Belum diisi"}
            posisi={pelatih?.posisi ?? "PELATIH"}
          />
          <AnggotaCard
            href={`/admin/tim/${tim_id}/danton`}
            image={danton?.foto ?? "/placeholder-profile-picture.jpg"}
            name={danton?.nama ?? "Belum diisi"}
            posisi={danton?.posisi ?? "DANTON"}
          />
          <AnggotaCard
            href={`/admin/tim/${tim_id}/official`}
            image={official?.foto ?? "/placeholder-profile-picture.jpg"}
            name={official?.nama ?? "Belum diisi"}
            posisi={official?.posisi ?? "OFFICIAL"}
          />
        </AnggotaCardsWrapper>
        {tim.tipe_tim === "NORMAL"
          ? rowsMapNormal.map((row, i) => (
              <AnggotaCardsWrapper key={i}>
                {row.map((pos, i) => {
                  const anggotaInPos = anggotas.find(
                    (value) => value.posisi === (pos.toUpperCase() as Posisi)
                  );

                  return (
                    <AnggotaCard
                      href={`/admin/tim/${tim_id}/${pos}`}
                      image={
                        anggotaInPos?.foto ?? "/placeholder-profile-picture.jpg"
                      }
                      name={anggotaInPos?.nama ?? "Belum diisi"}
                      posisi={"Posisi " + (anggotaInPos?.posisi ?? pos)}
                      key={anggotaInPos?.id ?? i}
                    />
                  );
                })}
              </AnggotaCardsWrapper>
            ))
          : rowsMapSmall.map((row, i) => (
              <AnggotaCardsWrapper key={i}>
                {row.map((pos, i) => {
                  const anggotaInPos = anggotas.find(
                    (value) => value.posisi === (pos.toUpperCase() as Posisi)
                  );

                  return (
                    <AnggotaCard
                      href={`/admin/tim/${tim_id}/${pos}`}
                      image={
                        anggotaInPos?.foto ?? "/placeholder-profile-picture.jpg"
                      }
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

const posisiOrder = [
  "PELATIH", "OFFICIAL", "DANTON",
  "B1S1", "B1S2", "B1S3", "B2S1", "B2S2", "B2S3", "B3S1", "B3S2", "B3S3",
  "B4S1", "B4S2", "B4S3", "B5S1", "B5S2", "B5S3",
];

// Foto tim & anggota yang bisa diunduh panitia untuk keperluan lain (publikasi,
// sertifikat, dst). Yang tersimpan adalah versi terkompres (maks. 1200px), bukan
// file asli dari kamera.
function FotoUnduh({ tim }: Readonly<{ tim: TimWithRelations }>) {
  const [downloading, setDownloading] = useState(false);

  const items = [
    ...(tim.foto
      ? [{ key: "tim", src: tim.foto, label: "Foto Tim", sub: tim.nama_tim, filename: `Foto-Tim-${tim.nama_tim}` }]
      : []),
    ...[...tim.anggotas]
      .filter((a) => a.foto)
      .sort((a, b) => posisiOrder.indexOf(a.posisi) - posisiOrder.indexOf(b.posisi))
      .map((a) => ({
        key: a.id,
        src: a.foto,
        label: a.nama,
        sub: a.posisi,
        filename: `${a.posisi}-${a.nama}`,
      })),
  ];

  async function unduhSemua() {
    setDownloading(true);
    for (const item of items) {
      const a = document.createElement("a");
      a.href = toDownloadUrl(item.src, item.filename);
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Jeda antar unduhan supaya browser tidak menggabung/menolaknya.
      await new Promise((r) => setTimeout(r, 600));
    }
    setDownloading(false);
  }

  if (items.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <H3>Unduh Foto ({items.length})</H3>
        <button
          type="button"
          onClick={unduhSemua}
          disabled={downloading}
          className="bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          {downloading ? "Mengunduh..." : "Unduh Semua Foto"}
        </button>
      </div>
      <P className="text-xs text-gray-400 mb-4">
        Kalau browser menanyakan izin unduh banyak file, pilih Izinkan. Foto tersimpan dalam ukuran terkompres (maks. 1200px).
      </P>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {items.map((item) => (
          <div key={item.key} className="bg-white rounded-xl border border-neutral-200 p-3 flex flex-col gap-2">
            <Image
              src={item.src}
              alt={item.label}
              width={150}
              height={200}
              unoptimized
              className="w-full aspect-[3/4] object-cover rounded-lg"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-black truncate">{item.label}</p>
              <p className="text-xs text-gray-400 truncate">{item.sub}</p>
            </div>
            <a
              href={toDownloadUrl(item.src, item.filename)}
              className="text-center text-xs font-semibold text-primary-600 border border-primary-200 hover:bg-primary-50 rounded-lg py-1.5 transition-colors"
            >
              Unduh
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuratRekomendasi({ tim }: Readonly<{ tim: TimWithRelations }>) {
  return (
    <div className="mb-10">
      <H3 className="mb-2">Surat Rekomendasi Kepala Sekolah</H3>
      {tim.linkRekomendasi ? (
        <a
          href={tim.linkRekomendasi}
          target="_blank"
          rel="noreferrer"
          className="text-primary-600 hover:underline text-sm break-all"
        >
          {tim.linkRekomendasi}
        </a>
      ) : (
        <P className="text-sm text-gray-400">Belum diisi tim.</P>
      )}
    </div>
  );
}

export default function ProfileTim({
  tim,
}: Readonly<{ tim: TimWithRelations }>) {
  return (
    <>
      <SuratRekomendasi tim={tim} />
      <FotoUnduh tim={tim} />
      <TimLayout tim={tim} />
    </>
  );
}
