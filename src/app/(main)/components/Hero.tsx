import { RightArrow } from "@/app/components/global/Icons";
import { SecondaryLinkButton } from "@/app/components/global/LinkButton";
import { getServerSession } from "@/lib/next-auth";
import { getKonfigUmum } from "@/queries/konfigUmum.query";
import dynamic from "next/dynamic";
import Image from "next/image";

const Countdown = dynamic(() => import("./parts/Countdown"), { ssr: false });

export default async function Hero() {
  const [session, konfig] = await Promise.all([getServerSession(), getKonfigUmum()]);
  const countdownTarget = new Date(konfig.countdownTarget);

  const dashboardHref =
    session?.user?.role === "ADMIN" ? "/admin" : session ? "/dashboard" : "/auth/register";

  return (
    <section className="relative w-full min-h-screen flex flex-col" id="hero">
      {/* Background image */}
      <Image
        src="/image/paskihero.jpg"
        alt="hero background"
        fill
        priority
        className="object-cover object-center -z-10"
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80 -z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary-900/60 via-transparent to-transparent -z-10" />

      {/* Decorative blobs */}
      <div className="absolute top-20 right-20 w-72 h-72 rounded-full bg-primary-500/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-40 left-10 w-96 h-96 rounded-full bg-primary-700/20 blur-3xl pointer-events-none" />

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center px-6 lg:px-[72px] xl:px-[118px] pt-28 pb-12">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-12">

          {/* Left — headline + CTA */}
          <div className="flex flex-col gap-6 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 w-fit">
              <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
              <span className="text-white/90 text-sm font-semibold tracking-wide">
                Antareja 2026 · SMK Telkom Malang
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] tracking-tight">
                AKSI TELKOM
              </h1>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight">
                <span className="text-white">BARISAN </span>
                <span className="italic text-primary-400">JAWARA</span>
              </h1>
            </div>

            <p className="text-white/70 text-base sm:text-lg max-w-lg leading-relaxed">
              Selamat datang di website resmi Lomba Ketangkasan Baris Berbaris
              yang diselenggarakan oleh Paskibra SMK Telkom Malang.
            </p>

            <div className="flex flex-wrap gap-3">
              <SecondaryLinkButton
                href={dashboardHref}
                className="group inline-flex items-center gap-2 py-3 px-6 rounded-xl font-bold text-sm hover:bg-primary-500 hover:text-white hover:border-primary-500 transition-all duration-300"
              >
                {session ? "Lihat Dashboard" : "Daftar Sekarang"}
                <RightArrow className="group-hover:translate-x-1 transition-transform duration-300" />
              </SecondaryLinkButton>
              <a
                href="#Kategori"
                className="inline-flex items-center gap-2 py-3 px-6 rounded-xl font-bold text-sm text-white/80 border border-white/20 hover:bg-white/10 transition-all duration-300"
              >
                Pelajari Lebih
              </a>
            </div>
          </div>

          {/* Right — countdown */}
          <div className="w-full lg:w-auto flex justify-center">
            <div className="bg-white/5 backdrop-blur-md border border-white/15 rounded-3xl p-8 shadow-2xl">
              <Countdown endDate={countdownTarget} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom info card */}
      <div className="relative z-10 mx-6 lg:mx-[72px] xl:mx-[118px] mb-0 -mb-12">
        <div className="bg-white rounded-3xl shadow-2xl p-8 flex flex-col xl:flex-row items-start xl:items-center gap-8 xl:gap-16">
          <div className="flex items-center gap-5 shrink-0">
            <div className="flex items-center justify-center p-4 bg-primary-500 rounded-2xl shadow-lg shadow-primary-500/30">
              <Image src="/icon.svg" width={48} height={48} alt="logo" className="invert w-8 h-8 sm:w-12 sm:h-12" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">kenalan dulu yuk</p>
              <p className="font-extrabold text-xl text-black leading-tight">
                Apa sih makna <span className="text-primary-500">Antareja?</span>
              </p>
            </div>
          </div>
          <div className="w-px h-16 bg-gray-200 hidden xl:block shrink-0" />
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
            Antareja merupakan tokoh pewayangan yang memiliki sifat rela berkorban dan rasa
            percaya yang besar. Antareja melambangkan barisan yang beraksi dengan penuh semangat
            dan percaya bahwa menjadi sang pemenang adalah sebuah kehormatan.
          </p>
        </div>
      </div>

      {/* Spacer for the card overlap */}
      <div className="h-12" />
    </section>
  );
}
