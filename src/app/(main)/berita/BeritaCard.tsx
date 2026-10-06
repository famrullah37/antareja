import { formatTanggalBerita } from "@/lib/berita";
import { Berita } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";

export default function BeritaCard({ berita: b }: { berita: Berita }) {
  return (
    <Link
      href={`/berita/${b.slug}`}
      className="group bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
    >
      <div className="relative aspect-video bg-neutral-100">
        {b.coverUrl && (
          <Image
            src={b.coverUrl}
            alt={b.judul}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
      </div>
      <div className="p-5 flex flex-col gap-2 flex-1">
        <span className="text-xs text-gray-400">{formatTanggalBerita(b.publishedAt)}</span>
        <h3 className="font-bold leading-snug group-hover:text-primary-500 transition-colors">{b.judul}</h3>
        {b.ringkasan && <p className="text-sm text-neutral-600 line-clamp-3">{b.ringkasan}</p>}
      </div>
    </Link>
  );
}
