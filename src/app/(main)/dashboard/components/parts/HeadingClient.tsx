"use client";

import { useState } from "react";
import { PrimaryLinkButton } from "@/app/components/global/LinkButton";
import { PrimaryButton } from "@/app/components/global/Button";
import { H2, H3, P } from "@/app/components/global/Text";
import { FaDownload } from "react-icons/fa";
import {
  convertTimezone,
  stringifyDate,
  stringifyTime,
} from "@/utils/utilities";
import { Session } from "next-auth";
import RegistrationModal from "./RegistrationModal";

// Tipe pengumuman (bisa disesuaikan dengan struktur aslimu)
interface Pengumuman {
  id: string;
  content: string;
  createdAt: Date;
}

interface HeadingClientProps {
  session: Session | null;
  pengumumans: Pengumuman[];
}

export default function HeadingClient({ session, pengumumans }: HeadingClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formDownloadLink =
    "https://docs.google.com/document/d/1lPJ3RxCw1BA8M_vlP-MAAjuPPSm1Ickuf7dCLnkSjQw/export?format=docx";
  const manualDownloadLink =
    "https://drive.google.com/file/d/1SlmV82GvAk9OS0HNVWS-AUYIe6YiuU8C/view?usp=drive_link";
  

  const handleDownloadFormClick = () => {
    if (session?.user?.nama) {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between w-full mb-3">
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
          <PrimaryButton
            type="button"
            onClick={handleDownloadFormClick}
            className="inline-flex gap-2 items-center"
          >
            Unduh formulir pendaftaran
          </PrimaryButton>
          <PrimaryLinkButton
            href={manualDownloadLink}
            className="inline-flex gap-2 items-center"
          >
            Unduh buku panduan <FaDownload />
          </PrimaryLinkButton>
        </div>
      </div>

      <div className="block w-full bg-white rounded-lg p-5 mb-8">
        <H3 className="mb-8">Pengumuman Dari Panitia</H3>
        <div className="flex flex-col gap-6">
          {pengumumans.map((pengumuman) => (
            <div key={pengumuman.id} className="w-full flex items-center gap-4">
              <dl className="w-full text-gray-500 md:max-w-[20%] md:border-r md:border-gray-500">
                <dd className="flex flex-row gap-[18px] text-base font-medium leading-6 md:flex-col md:gap-2">
                  <time>{stringifyDate(pengumuman.createdAt)}</time>
                  <time>
                    {stringifyTime(
                      convertTimezone(pengumuman.createdAt, "Asia/Jakarta")
                    )}{" "}
                    WIB
                  </time>
                </dd>
              </dl>
              <div className="w-full md:w-[80%]">
                <P className="pl-0 md:pl-12">{pengumuman.content}</P>
              </div>
            </div>
          ))}
        </div>
      </div>

      <RegistrationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        formDownloadLink={formDownloadLink}
      />
    </>
  );
}
