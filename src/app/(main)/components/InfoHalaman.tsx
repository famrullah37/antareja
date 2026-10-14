import Link from "next/link";
import { ReactNode } from "react";
import { siteConfig } from "@/config/site";

// Halaman publik di luar beranda. Dipakai untuk tautan "Halaman lain" & breadcrumb.
export const HALAMAN_PUBLIK = [
  { path: "/galeri", label: "Galeri Foto" },
  { path: "/berita", label: "Berita" },
  { path: "/tiket", label: "Tiket Penonton" },
  { path: "/vote", label: "Vote Tim Favorit" },
  { path: "/merchandise", label: "Merchandise" },
] as const;

// Blok penjelasan di bawah halaman publik + data breadcrumb (schema.org).
// Tujuannya SEO: halaman yang isinya hanya form/daftar terlalu tipis untuk
// diindeks Google, jadi tiap halaman diberi teks penjelasan yang memang
// berguna bagi pengunjung, plus tautan internal ke halaman lain.
export default function InfoHalaman({
  path,
  label,
  judul,
  children,
}: {
  path: (typeof HALAMAN_PUBLIK)[number]["path"];
  label: string;
  judul: string;
  children: ReactNode;
}) {
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: siteConfig.name, item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: label, item: `${siteConfig.url}${path}` },
    ],
  };

  return (
    <aside className="max-w-5xl mx-auto px-4 pb-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <div className="border-t border-neutral-200 pt-8 grid gap-8 md:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-3 text-sm leading-relaxed text-gray-600">
          <h2 className="text-lg font-bold text-gray-900">{judul}</h2>
          {children}
        </div>
        <nav aria-label="Halaman lain" className="text-sm">
          <h2 className="font-bold text-gray-900 mb-3">Halaman lain</h2>
          <ul className="flex flex-col gap-2">
            <li>
              <Link href="/" className="text-primary-600 hover:underline">
                Beranda {siteConfig.name}
              </Link>
            </li>
            {HALAMAN_PUBLIK.filter((h) => h.path !== path).map((h) => (
              <li key={h.path}>
                <Link href={h.path} className="text-primary-600 hover:underline">
                  {h.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/auth/register" className="text-primary-600 hover:underline">
                Daftarkan Tim
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  );
}
