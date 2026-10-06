import { findBeritas } from "@/queries/berita.query";
import { PrimaryLinkButton } from "@/app/components/global/LinkButton";
import { H2, P } from "@/app/components/global/Text";
import SectionWrapper from "@/app/components/global/Wrapper";
import { RightArrow } from "@/app/components/global/Icons";
import BeritaCard from "../berita/BeritaCard";

export default async function BeritaSection() {
  const beritas = await findBeritas({ publish: true }, 3);

  if (beritas.length === 0) return null;

  return (
    <SectionWrapper id="berita">
      <div className="flex flex-col gap-6 w-full">
        <div className="flex flex-col gap-2">
          <H2>Berita Terbaru</H2>
          <P className="text-gray-500">Kabar terbaru seputar LPKBB Antareja 2026</P>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {beritas.map((b) => (
            <BeritaCard key={b.id} berita={b} />
          ))}
        </div>

        <div className="flex justify-center">
          <PrimaryLinkButton href="/berita" className="flex items-center gap-2 group px-8 py-3">
            Lihat Semua Berita
            <RightArrow className="group-hover:translate-x-1 transition-transform" />
          </PrimaryLinkButton>
        </div>
      </div>
    </SectionWrapper>
  );
}
