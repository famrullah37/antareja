import { RightArrow } from "@/app/components/global/Icons";
import { SecondaryLinkButton } from "@/app/components/global/LinkButton";
import SectionWrapper from "@/app/components/global/Wrapper";
import Image from "next/image";

export default function Daftar() {
  return (
    <SectionWrapper>
      <div className="relative w-full rounded-3xl overflow-hidden">
        {/* Background image */}
        <Image
          src="/image/paskidaftar.jpg"
          alt="daftar background"
          fill
          className="object-cover object-center"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/90 via-neutral-950/70 to-neutral-950/30" />

        {/* Content */}
        <div className="relative z-10 px-10 sm:px-16 py-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
          <div className="flex flex-col gap-5 max-w-xl">
            <span className="inline-flex items-center gap-2 text-primary-400 font-semibold text-sm uppercase tracking-widest w-fit">
              <span className="w-8 h-px bg-primary-400" />
              Bergabung Sekarang
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              Buktikan kemampuan mu <br />
              <span className="text-primary-400">bersama Antareja</span>
            </h2>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-md">
              Daftarkan tim terbaikmu dan raih penghargaan di ajang LKBB paling bergengsi
              se-Jawa Timur.
            </p>
          </div>

          <SecondaryLinkButton
            href="/auth/register"
            className="group shrink-0 inline-flex items-center gap-3 py-4 px-8 rounded-2xl font-bold text-sm hover:bg-primary-500 hover:text-white hover:border-primary-500 transition-all duration-300"
          >
            Daftar Sekarang
            <RightArrow className="group-hover:translate-x-1 transition-transform duration-300" />
          </SecondaryLinkButton>
        </div>
      </div>
    </SectionWrapper>
  );
}
