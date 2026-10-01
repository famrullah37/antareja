import SectionWrapper from "@/app/components/global/Wrapper";
import { getServerSession } from "@/lib/next-auth";
import { getKonfigUmum } from "@/queries/konfigUmum.query";
import { getPengumumans } from "@/queries/pengumuman.query";
import dynamic from "next/dynamic";
import HeadingClient from "./parts/HeadingClient";

const Countdown = dynamic(() => import("./parts/Countdown"), { ssr: false });

export default async function Heading() {
  const session = await getServerSession();
  const pengumumans = await getPengumumans();
  const konfig = await getKonfigUmum();

  return (
    <SectionWrapper id="heading">
      <HeadingClient session={session} pengumumans={pengumumans} juklakUrl={konfig.juklakUrl} />
      <Countdown />
    </SectionWrapper>
  );
}
