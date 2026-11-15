import SectionWrapper from "@/app/components/global/Wrapper";
import { getServerSession } from "@/lib/next-auth";
import { getKonfigUmum } from "@/queries/konfigUmum.query";
import { getPengumumans } from "@/queries/pengumuman.query";
import dynamic from "next/dynamic";
import HeadingClient from "./parts/HeadingClient";

const Countdown = dynamic(() => import("./parts/Countdown"), { ssr: false });

// ikutLomba = tim terkonfirmasi & tidak mundur/tidak hadir. Pengumuman "Setelah
// Lomba" (sertifikat, voucher, dll) hanya untuk mereka; "Sebelum Lomba" untuk
// semua tim terdaftar termasuk yang mundur.
export default async function Heading({ ikutLomba }: { ikutLomba: boolean }) {
  const session = await getServerSession();
  const pengumumans = (await getPengumumans()).filter((p) => p.tipe !== "SESUDAH" || ikutLomba);
  const konfig = await getKonfigUmum();

  return (
    <SectionWrapper id="heading">
      <HeadingClient session={session} pengumumans={pengumumans} juklakUrl={konfig.juklakUrl} />
      <Countdown />
    </SectionWrapper>
  );
}
