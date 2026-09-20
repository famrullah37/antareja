import Image from "next/image";
import { P } from "./Text";
import Link from "next/link";
import { FaTiktok, FaInstagram, FaYoutube } from "react-icons/fa";
import { siteConfig } from "@/config/site";

interface FootOption {
  label: string;
  href: string;
}

const FootOptions: FootOption[] = [
  { label: "Beranda", href: "/" },
  { label: "Kategori", href: "/#Kategori" },
  { label: "Video", href: "/#video" },
  { label: "Pendaftaran", href: "/#daftar" },
];

// Akun media sosial resmi: satu sumber di src/config/site.ts.
const socials = [
  { icon: <FaTiktok />, href: siteConfig.social.tiktok, label: "TikTok" },
  { icon: <FaInstagram />, href: siteConfig.social.instagram, label: "Instagram" },
  { icon: <FaYoutube />, href: siteConfig.social.youtube, label: "YouTube" },
].filter((s) => !!s.href);

export default function Footer() {
  return (
    <footer className="pt-[56px] pb-[39px] px-[21px] sm:px-[52px] bg-white">
      <div className="flex flex-col gap-6 lg:gap-[50px]">
        <div className="flex justify-normal lg:justify-between lg:flex-row flex-col lg:gap-0 gap-6">
          <div className="flex flex-col gap-[10px] lg:gap-6 max-w-[408px]">
            <Image
              src={"/logo-text.svg"}
              alt="logo"
              width={125}
              height={44}
              className="w-14 h-[19px] lg:w-[125px] lg:h-[44px]"
            />
            <P className="text-base text-wrap text-neutral-200">
              Website resmi LKBB Antareja tingkat Jawa Timur yang
              diselenggarakan oleh SMK Telkom Malang.
            </P>
          </div>
          <div className="flex flex-col gap-6 lg:gap-[72px] items-start lg:items-end">
            <div className="flex gap-[17px] sm:gap-10">
              {FootOptions.map((nav) => (
                <Link href={nav.href} key={nav.label}>
                  <p className="text-neutral-600 text-sm hover:text-gray-400 transition-all duration-300 font-semibold">
                    {nav.label}
                  </p>
                </Link>
              ))}
            </div>
            {socials.length > 0 && (
              <div className="flex gap-2 sm:gap-3">
                {socials.map((soc) => (
                  <Link
                    href={soc.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={soc.label}
                    key={soc.label}
                    className="p-[14px] bg-neutral-400 text-primary-500 text-[18px] rounded-2xl"
                  >
                    {soc.icon}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="w-full">
          <div className="w-full h-[1px] bg-[#D9E1EE]"></div>
          <P className="text-sm text-neutral-600 mt-[10px]">
            Copyright&copy; Antareja 2026
          </P>
        </div>
      </div>
    </footer>
  );
}
