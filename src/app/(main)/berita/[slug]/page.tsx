export const dynamic = "force-dynamic";

import { findBerita, findBeritas } from "@/queries/berita.query";
import ShareButtons from "./ShareButtons";
import BeritaCard from "../BeritaCard";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatTanggalBerita } from "@/lib/berita";
import { siteConfig } from "@/config/site";

import type { Metadata } from "next";

async function getBerita(slug: string) {
  const berita = await findBerita({ slug });
  return berita?.publish ? berita : null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const berita = await getBerita(params.slug);
  if (!berita) return { title: "Berita tidak ditemukan" };
  const description = berita.ringkasan ?? berita.konten.slice(0, 160);
  const image = berita.coverUrl ?? `${siteConfig.url}${siteConfig.ogImage}`;
  return {
    title: berita.judul,
    description,
    // openGraph/twitter halaman menggantikan (bukan menggabung) milik layout,
    // jadi siteName/locale/gambar default diisi ulang di sini.
    openGraph: {
      type: "article",
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      title: berita.judul,
      description,
      publishedTime: berita.publishedAt?.toISOString(),
      modifiedTime: berita.updatedAt.toISOString(),
      authors: [berita.penulis],
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: berita.judul,
      description,
      images: [image],
    },
  };
}

export default async function BeritaDetailPage({ params }: { params: { slug: string } }) {
  const berita = await getBerita(params.slug);
  if (!berita) return notFound();

  const paragraf = berita.konten.split(/\n\s*\n/).filter((p) => p.trim());
  const url = `${siteConfig.url}/berita/${berita.slug}`;
  const lainnya = await findBeritas({ publish: true, id: { not: berita.id } }, 3);

  // Data terstruktur artikel: membantu Google menampilkan judul, tanggal &
  // gambar berita di hasil pencarian.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: url,
    url,
    headline: berita.judul.slice(0, 110),
    description: berita.ringkasan ?? berita.konten.slice(0, 160),
    image: [berita.coverUrl ?? `${siteConfig.url}${siteConfig.ogImage}`],
    datePublished: berita.publishedAt?.toISOString(),
    dateModified: berita.updatedAt.toISOString(),
    author: { "@type": "Person", name: berita.penulis },
    publisher: { "@id": `${siteConfig.url}/#organisasi` },
    inLanguage: "id-ID",
  };

  return (
    <>
      <article className="max-w-3xl mx-auto px-4 py-10 lg:py-16 flex flex-col gap-6">
        <script
          type="application/ld+json"
          // "<" di-escape supaya isi berita tidak bisa menutup tag <script>.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        <Link href="/berita" className="text-sm text-primary-500 hover:underline w-fit">
          &larr; Semua berita
        </Link>
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl lg:text-4xl font-bold leading-tight">{berita.judul}</h1>
          <div className="text-sm text-gray-400">
            {formatTanggalBerita(berita.publishedAt)} · {berita.penulis}
          </div>
        </header>
        {berita.coverUrl && (
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-neutral-100">
            <Image src={berita.coverUrl} alt={berita.judul} fill priority sizes="(max-width: 768px) 100vw, 768px" className="object-cover" />
          </div>
        )}
        <div className="flex flex-col gap-4 text-neutral-700 leading-relaxed">
          {paragraf.map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p.trim()}
            </p>
          ))}
        </div>
        <ShareButtons url={url} judul={berita.judul} />
      </article>

      {lainnya.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pb-16 flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl lg:text-2xl font-bold">Berita lainnya</h2>
            <Link href="/berita" className="text-sm text-primary-500 hover:underline">
              Semua berita &rarr;
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {lainnya.map((b) => (
              <BeritaCard key={b.id} berita={b} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
