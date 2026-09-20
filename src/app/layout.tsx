import cn from "@/lib/clsx";
import type { Metadata, Viewport } from "next";
import ProgressbarProvider from "./components/wrapper/ProgressbarProvider";
import SessionProvider from "./components/wrapper/SessionProvider";
import ToasterProvider from "./components/wrapper/ToasterProvider";
import "./globals.css";
import basierFont from "./font";
import { siteConfig } from "@/config/site";

// Alamat absolut (bukan relatif) supaya pratinjau media sosial selalu memakai domain produksi.
const ogImageUrl = `${siteConfig.url}${siteConfig.ogImage}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.title, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  applicationName: siteConfig.name,
  authors: [{ name: "Paskatema DEV" }],
  creator: "Paskatema DEV",
  publisher: siteConfig.organizer,
  // "./" = canonical mengikuti alamat halaman itu sendiri (bukan selalu "/").
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `${siteConfig.name} 2026` }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: [ogImageUrl],
  },
  robots: { index: true, follow: true },
  verification: { google: "5b4dyR8sHph6P_xwuaaNfnN4FMAlL4G_GsWznRP5tuA" },
};

// Data terstruktur (schema.org) untuk mesin pencari: identitas penyelenggara & situs.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organisasi`,
      name: siteConfig.name,
      url: siteConfig.url,
      logo: `${siteConfig.url}${siteConfig.logo}`,
      sameAs: Object.values(siteConfig.social),
      parentOrganization: { "@type": "EducationalOrganization", name: siteConfig.organizer },
    },
    {
      "@type": "WebSite",
      "@id": `${siteConfig.url}/#situs`,
      url: siteConfig.url,
      name: siteConfig.name,
      description: siteConfig.description,
      inLanguage: "id-ID",
      publisher: { "@id": `${siteConfig.url}/#organisasi` },
    },
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="scroll-smooth">
      <body className={cn(basierFont.className + " relative")}>
        <script
          type="application/ld+json"
          // Konten dari konstanta di kode (bukan input pengguna); "<" di-escape supaya tidak bisa menutup tag script.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        <SessionProvider>
          <ToasterProvider />
          <ProgressbarProvider>{children}</ProgressbarProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
