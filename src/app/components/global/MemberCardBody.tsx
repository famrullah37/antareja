import { Person } from "@/app/components/global/Icons";
import { P } from "@/app/components/global/Text";
import Image from "next/image";

// Isi kartu anggota: foto rasio 3x4 (sama dengan pas foto yang diupload) utuh + label
// nama/posisi di bawahnya (tidak menimpa foto). Dipakai kartu dashboard tim & admin.
export default function MemberCardBody({
  image,
  name,
  posisi,
}: Readonly<{ image: string; name: string; posisi: string }>) {
  return (
    <>
      <div className="relative w-full aspect-[3/4]">
        <Image
          src={image}
          alt={`${name}'s Photo`}
          fill
          sizes="(max-width: 640px) 65vw, 220px"
          className="object-cover rounded-3xl bg-neutral-200"
          unoptimized
        />
      </div>
      <div className="mt-2 w-full rounded-2xl p-3 bg-white drop-shadow-md flex items-center gap-3">
        <div className="shrink-0 p-2.5 rounded-xl bg-primary-500 drop-shadow-glow">
          <Person />
        </div>
        <div className="min-w-0 text-start">
          <P className="font-bold text-black text-sm sm:text-sm truncate">{name}</P>
          <P className="text-xs sm:text-xs truncate">{posisi.toUpperCase()}</P>
        </div>
      </div>
    </>
  );
}
