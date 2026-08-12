export const dynamic = "force-dynamic";
import Kategori from "./components/Kategori";
import Sponsor from "./components/Sponsor";
import Video from "./components/Video";
import Daftar from "./components/Daftar";
import Hero from "./components/Hero";
import Timeline from "./components/Timeline";
import Juri from "./components/Juri";
import Throwback from "./components/Throwback";
import TiketSection from "./components/TiketSection";
import RevealSection from "./components/parts/RevealSection";
import ComingSoon from "./components/ComingSoon";
import { getKonfigUmum } from "@/queries/konfigUmum.query";

export default async function LandingPage() {
  const konfig = await getKonfigUmum();
  const countdownTarget = new Date(konfig.countdownTarget);
  const isLive = konfig.countdownAktif && countdownTarget.getTime() <= Date.now();

  if (!isLive) {
    return <ComingSoon target={konfig.countdownAktif ? countdownTarget : null} />;
  }

  return (
    <>
      <Hero />
      <RevealSection delay={0}>
        <Kategori />
      </RevealSection>
      <RevealSection delay={0}>
        <Video />
      </RevealSection>
      <RevealSection delay={0}>
        <Timeline />
      </RevealSection>
      <RevealSection delay={0}>
        <Juri />
      </RevealSection>
      <RevealSection delay={0}>
        <Throwback />
      </RevealSection>
      <RevealSection delay={0}>
        <TiketSection />
      </RevealSection>
      <RevealSection delay={0}>
        <Daftar />
      </RevealSection>
      <RevealSection delay={0}>
        <Sponsor />
      </RevealSection>
    </>
  );
}
