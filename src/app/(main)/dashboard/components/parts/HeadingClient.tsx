"use client";

import { PrimaryLinkButton } from "@/app/components/global/LinkButton";
import { H2, H3, P } from "@/app/components/global/Text";
import { FaDownload } from "react-icons/fa";
import {
  convertTimezone,
  stringifyDate,
  stringifyTime,
} from "@/utils/utilities";
import { Session } from "next-auth";

// Tipe pengumuman (bisa disesuaikan dengan struktur aslimu)
interface Pengumuman {
  id: string;
  content: string;
  createdAt: Date;
  tipe: string;
}

interface HeadingClientProps {
  session: Session | null;
  pengumumans: Pengumuman[];
  juklakUrl: string | null;
}

export default function HeadingClient({
  session,
  pengumumans,
  juklakUrl,
}: HeadingClientProps) {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full mb-3">
        <H2 className="mb-2">
          Selamat Datang, {session?.user?.nama ?? "Tamu"} 👋
        </H2>
        <div className="flex flex-col sm:flex-row gap-3">
          <PrimaryLinkButton
            href="/dashboard/profile"
            className="inline-flex gap-2 items-center"
          >
            Profil Saya
          </PrimaryLinkButton>
          {juklakUrl && (
            <PrimaryLinkButton
              href={juklakUrl}
              target="_blank"
              className="inline-flex gap-2 items-center"
            >
              Unduh Juklak <FaDownload />
            </PrimaryLinkButton>
          )}
        </div>
      </div>

      <div className="block w-full bg-white rounded-lg p-5 mb-8">
        <H3 className="mb-8">Pengumuman Dari Panitia</H3>
        {pengumumans.length === 0 && (
          <P className="text-gray-400">Belum ada pengumuman.</P>
        )}
        {/* Setelah Lomba di atas (paling relevan setelah acara), lalu Sebelum Lomba. */}
        {(["SESUDAH", "SEBELUM"] as const).map((tipe) => {
          const daftar = pengumumans.filter(
            (p) => (p.tipe === "SESUDAH" ? "SESUDAH" : "SEBELUM") === tipe,
          );
          if (daftar.length === 0) return null;
          return (
            <div key={tipe} className="mb-8 last:mb-0">
              <div
                className={`inline-block text-xs font-bold uppercase tracking-wide rounded-full px-3 py-1 mb-4 ${
                  tipe === "SESUDAH"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-sky-100 text-sky-700"
                }`}
              >
                {tipe === "SESUDAH" ? "Setelah Lomba" : "Sebelum Lomba"}
              </div>
              <div className="flex flex-col gap-6">
                {daftar.map((pengumuman) => (
                  <div
                    key={pengumuman.id}
                    className="w-full flex flex-col md:flex-row md:items-center gap-1 md:gap-4"
                  >
                    <dl className="w-full text-gray-500 md:max-w-[20%] md:border-r md:border-gray-500">
                      <dd className="flex flex-row gap-[18px] text-sm md:text-base font-medium leading-6 md:flex-col md:gap-2">
                        <time>{stringifyDate(pengumuman.createdAt)}</time>
                        <time>
                          {stringifyTime(
                            convertTimezone(
                              pengumuman.createdAt,
                              "Asia/Jakarta",
                            ),
                          )}{" "}
                          WIB
                        </time>
                      </dd>
                    </dl>
                    <div className="w-full md:w-[80%]">
                      <P className="pl-0 md:pl-12 whitespace-pre-line">
                        {pengumuman.content}
                      </P>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
