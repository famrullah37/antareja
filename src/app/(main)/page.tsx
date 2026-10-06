export const dynamic = "force-dynamic";
import Kategori from "./components/Kategori";
import Sponsor from "./components/Sponsor";
import BeritaSection from "./components/BeritaSection";
import Video from "./components/Video";
import Daftar from "./components/Daftar";
import Hero from "./components/Hero";
import Timeline from "./components/Timeline";
import Juri from "./components/Juri";
import Throwback from "./components/Throwback";
import TiketSection from "./components/TiketSection";
import RevealSection from "./components/parts/RevealSection";
import ComingSoon from "./components/ComingSoon";
import EventJsonLd from "./components/EventJsonLd";
import { getKonfigUmum, type TimelineItem } from "@/queries/konfigUmum.query";

export default async function LandingPage() {
  const konfig = await getKonfigUmum();
  const countdownTarget = new Date(konfig.countdownTarget);
  const isLive = konfig.countdownAktif && countdownTarget.getTime() <= Date.now();

  const timeline = konfig.timeline as TimelineItem[] | null;

  if (!isLive) {
    return (
      <>
        <EventJsonLd timeline={timeline} />
        <ComingSoon target={konfig.countdownAktif ? countdownTarget : null} />
      </>
    );
  }

  return (
    <>
      <EventJsonLd timeline={timeline} />
      <Hero />
      <RevealSection delay={0}>
        <Kategori />
      </RevealSection>
      <RevealSection delay={0}>
        <Video />
      </RevealSection>
      <RevealSection delay={0}>
        <Timeline items={timeline} />
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
        <BeritaSection />
      </RevealSection>
      <RevealSection delay={0}>
        <Sponsor />
      </RevealSection>
    </>
  );
}
