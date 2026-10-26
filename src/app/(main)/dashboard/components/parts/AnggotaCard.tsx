import MemberCardBody from "@/app/components/global/MemberCardBody";
import Link from "next/link";

interface AnggotaCardProps {
  image: string;
  name: string;
  posisi: string;
  href: string;
}

export function AnggotaCard({
  image,
  name,
  posisi,
  href,
}: Readonly<AnggotaCardProps>) {
  return (
    <Link
      href={href}
      className="relative block mb-6 w-[40%] sm:w-[28%] max-w-[200px] hover:scale-105 transition-all duration-300"
    >
      <MemberCardBody image={image} name={name} posisi={posisi} />
    </Link>
  );
}
