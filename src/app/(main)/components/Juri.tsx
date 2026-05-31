import SectionWrapper from "@/app/components/global/Wrapper";
import { findJuris } from "@/queries/juri.query";
import Image from "next/image";

interface JuriCardProps {
  image: string;
  name: string;
  title: string;
}

function JuriCard({ image, name, title }: JuriCardProps) {
  return (
    <div className="group flex flex-col items-center gap-4 bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 w-full sm:w-[220px] shrink-0">
      <div className="relative w-28 h-28 rounded-2xl overflow-hidden bg-primary-50 ring-4 ring-primary-100 group-hover:ring-primary-300 transition-all duration-300">
        <Image
          src={image}
          alt={`Foto ${name}`}
          fill
          className="object-cover"
          unoptimized
        />
      </div>
      <div className="text-center flex flex-col gap-1">
        <p className="font-bold text-neutral-900 text-sm leading-snug">{name}</p>
        <span className="inline-flex px-3 py-1 bg-primary-50 text-primary-600 text-xs font-semibold rounded-full border border-primary-100">
          {title}
        </span>
      </div>
    </div>
  );
}

export default async function Juri() {
  const juris = await findJuris();

  const displayJuris = juris.length > 0
    ? juris
    : [{ foto: "/image/man.png", nama: "–", kategori: "Juri" }];

  return (
    <SectionWrapper id="juri">
      {/* Dark background section */}
      <div className="relative bg-neutral-950 rounded-3xl overflow-hidden px-8 py-14 flex flex-col gap-12">
        {/* Decorative blob */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-60 h-60 rounded-full bg-primary-700/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col gap-3 relative z-10">
          <span className="inline-flex items-center gap-2 text-primary-400 font-semibold text-sm uppercase tracking-widest">
            <span className="w-8 h-px bg-primary-400" />
            Dewan Juri
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
            Juri LKBB{" "}
            <span className="text-primary-400">Antareja 2026</span>
          </h2>
          <p className="text-gray-400 max-w-md">
            Kenali para profesional yang akan menilai penampilan terbaik tim Anda.
          </p>
        </div>

        {/* Cards */}
        <div className="relative z-10 flex flex-wrap gap-5 justify-center sm:justify-start">
          {displayJuris.map((j) => (
            <JuriCard key={j.nama} image={j.foto} name={j.nama} title={j.kategori} />
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
