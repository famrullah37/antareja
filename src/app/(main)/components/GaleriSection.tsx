import { findFotos } from "@/queries/galeri.query";
import { PrimaryLinkButton } from "@/app/components/global/LinkButton";
import { H2, P } from "@/app/components/global/Text";
import SectionWrapper from "@/app/components/global/Wrapper";
import { RightArrow } from "@/app/components/global/Icons";
import Image from "next/image";

export default async function GaleriSection() {
  const fotos = await findFotos({ statusPublish: true });

  if (fotos.length === 0) return null;

  const preview = fotos.slice(0, 8);

  return (
    <SectionWrapper id="galeri">
      <div className="flex flex-col gap-6 w-full">
        <div className="flex flex-col gap-2">
          <H2>Galeri Foto</H2>
          <P className="text-gray-500">
            Dokumentasi LKBB Antareja 2026 — SMK Telkom Malang
          </P>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {preview.map((foto) => {
            const isGratis = foto.album.tipe === "GRATIS";
            return (
              <div
                key={foto.id}
                className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100 group"
              >
                <Image
                  src={isGratis ? foto.pathAsli : foto.pathWatermark}
                  alt={foto.tagTim ?? "Foto LKBB Antareja"}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
                {!isGratis && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-white/25 text-lg font-bold rotate-[-30deg] select-none tracking-widest">
                      ANTAREJA
                    </span>
                  </div>
                )}
                {isGratis && (
                  <div className="absolute top-2 left-2">
                    <span className="text-[9px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded">
                      GRATIS
                    </span>
                  </div>
                )}
                {foto.tagTim && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {foto.tagTim}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-center">
          <PrimaryLinkButton
            href="/galeri"
            className="flex items-center gap-2 group px-8 py-3"
          >
            Lihat Semua Foto
            <RightArrow className="group-hover:translate-x-1 transition-transform" />
          </PrimaryLinkButton>
        </div>
      </div>
    </SectionWrapper>
  );
}
