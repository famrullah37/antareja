import Image from "next/image";
import dynamic from "next/dynamic";

const Countdown = dynamic(() => import("./parts/Countdown"), { ssr: false });

export default function ComingSoon({ target }: { target: Date | null }) {
  return (
    <section className="relative w-full min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      <Image
        src="/image/paskihero.jpg"
        alt="Antareja"
        fill
        priority
        className="object-cover object-center -z-10"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/85 -z-10" />
      <div className="absolute top-20 right-20 w-72 h-72 rounded-full bg-primary-500/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-40 left-10 w-96 h-96 rounded-full bg-primary-700/20 blur-3xl pointer-events-none" />

      <Image
        src="/icon-colored.svg"
        alt="Antareja"
        width={72}
        height={72}
        className="mb-6 w-16 h-16 sm:w-20 sm:h-20"
      />

      <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-6 w-fit">
        <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
        <span className="text-white/90 text-sm font-semibold tracking-wide">
          Antareja · SMK Telkom Malang
        </span>
      </div>

      <h1 className="text-4xl sm:text-6xl font-extrabold text-white leading-tight tracking-tight mb-4">
        Segera <span className="italic text-primary-400">Hadir</span>
      </h1>
      <p className="text-white/70 text-base sm:text-lg max-w-xl leading-relaxed mb-10">
        Kami sedang menyiapkan sesuatu yang seru untuk Lomba Ketangkasan Baris
        Berbaris. Nantikan pengumuman resmi kami segera.
      </p>

      {target && (
        <div className="bg-white/5 backdrop-blur-md border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <Countdown endDate={target} label="Menuju Peluncuran Situs" />
        </div>
      )}
    </section>
  );
}
