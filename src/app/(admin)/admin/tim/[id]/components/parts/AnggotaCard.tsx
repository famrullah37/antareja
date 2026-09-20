import MemberCardBody from "@/app/components/global/MemberCardBody";
import Link from "next/link";

interface AnggotaCardProps {
  image: string;
  name: string;
  posisi: string;
  href?: string;
}

export function AnggotaCard({
  image,
  name,
  posisi,
  href,
}: Readonly<AnggotaCardProps>) {
  const className = "relative block mb-6 w-[65vw] sm:w-1/6";
  return href ? (
    <Link href={href} className={`${className} hover:scale-105 transition-all duration-300`}>
      <MemberCardBody image={image} name={name} posisi={posisi} />
    </Link>
  ) : (
    <div className={className}>
      <MemberCardBody image={image} name={name} posisi={posisi} />
    </div>
  );
}
