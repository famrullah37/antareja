import SectionWrapper from "@/app/components/global/Wrapper";
import { findSponsors } from "@/queries/sponsor.query";
import Image from "next/image";
import Link from "next/link";

type SponsorItem = {
  id: string;
  nama: string;
  logoUrl: string;
  linkUrl: string | null;
  tipe: string;
  urutan: number;
  aktif: boolean;
};

// Logo statis yang selalu ditampilkan
const STATIC_SPONSORS: { nama: string; logoUrl: string; linkUrl: string | null }[] = [
  { nama: "Dinas Pemuda dan Olahraga", logoUrl: "/sponsors/Kemenpora.png", linkUrl: null },
];

function SponsorCard({ nama, logoUrl, linkUrl }: { nama: string; logoUrl: string; linkUrl: string | null }) {
  const card = (
    <div className="py-6 px-5 bg-white rounded-2xl flex items-center justify-center w-[145px] sm:w-[180px] h-[90px] hover:scale-105 transition-all duration-300 shadow-sm hover:shadow-md border border-gray-100">
      <Image
        src={logoUrl}
        alt={nama}
        width={140}
        height={60}
        unoptimized
        className="object-contain max-h-[56px]"
      />
    </div>
  );

  if (linkUrl) {
    return (
      <Link href={linkUrl} target="_blank" rel="noopener noreferrer">
        {card}
      </Link>
    );
  }
  return card;
}

function SponsorGroup({ label, items }: { label: string; items: { nama: string; logoUrl: string; linkUrl: string | null; id?: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      <div className="w-full flex gap-4 sm:gap-6 justify-center items-center flex-wrap">
        {items.map((s) => (
          <SponsorCard key={s.id ?? s.nama} nama={s.nama} logoUrl={s.logoUrl} linkUrl={s.linkUrl} />
        ))}
      </div>
    </div>
  );
}

export default async function Sponsor() {
  const dbSponsors = await findSponsors({ aktif: true });

  const mainSponsors = [
    ...STATIC_SPONSORS,
    ...(dbSponsors as SponsorItem[]).filter((s) => s.tipe === "SPONSOR"),
  ];
  const mediaPartners = (dbSponsors as SponsorItem[]).filter((s) => s.tipe === "MEDIA_PARTNER");
  const supportBy = (dbSponsors as SponsorItem[]).filter((s) => s.tipe === "SUPPORT_BY");

  if (mainSponsors.length === 0 && mediaPartners.length === 0 && supportBy.length === 0) return null;

  return (
    <SectionWrapper id="sponsor">
      <div className="flex w-full flex-col gap-10 justify-center items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="inline-flex items-center gap-2 text-primary-500 font-semibold text-sm uppercase tracking-widest">
            <span className="w-8 h-px bg-primary-500" />
            Mitra Kami
            <span className="w-8 h-px bg-primary-500" />
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-black">
            Sponsorship &amp; <span className="text-primary-500">Media Partner</span>
          </h2>
          <p className="text-gray-500">
            Terima kasih kepada seluruh pihak yang mendukung Antareja 2026.
          </p>
        </div>
        <div className="flex flex-col gap-8 w-full items-center">
          <SponsorGroup label="Sponsor" items={mainSponsors} />
          <SponsorGroup label="Media Partner" items={mediaPartners} />
          <SponsorGroup label="Support By" items={supportBy} />
        </div>
      </div>
    </SectionWrapper>
  );
}
