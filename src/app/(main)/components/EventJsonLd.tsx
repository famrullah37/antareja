import { siteConfig } from "@/config/site";
import { getInfoAcara } from "@/lib/acara";
import type { TimelineItem } from "@/queries/konfigUmum.query";

// Data terstruktur schema.org Event untuk beranda, supaya Google bisa
// menampilkan tanggal & lokasi acara di hasil pencarian. Tanggal/jam dari
// timeline admin (lihat lib/acara.ts); kalau tanggalnya tidak terbaca, tidak
// dirender sama sekali — lebih baik tanpa Event daripada Event bertanggal salah.
export default function EventJsonLd({ timeline }: { timeline: TimelineItem[] | null }) {
  const acara = getInfoAcara(timeline);
  if (!acara?.startDate) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    "@id": `${siteConfig.url}/#acara`,
    name: `${siteConfig.name} ${acara.tahun}`,
    description: siteConfig.description,
    url: siteConfig.url,
    image: [`${siteConfig.url}${siteConfig.ogImage}`],
    startDate: acara.startDate,
    endDate: acara.endDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: siteConfig.event.venue,
      address: { "@type": "PostalAddress", ...siteConfig.event.address },
    },
    organizer: { "@id": `${siteConfig.url}/#organisasi` },
    // Tanpa "availability": penjualan tiket belum tentu dibuka, jangan klaim tersedia.
    offers: { "@type": "Offer", url: `${siteConfig.url}/tiket` },
  };

  return (
    <script
      type="application/ld+json"
      // Konten bisa memuat teks dari admin; "<" di-escape supaya tidak bisa menutup tag script.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
    />
  );
}
