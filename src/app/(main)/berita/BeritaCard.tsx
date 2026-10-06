import { formatTanggalBerita } from "@/lib/berita";
import { Berita } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";

// Berita tanpa sampul: gradasi merah + logo putih, bukan kotak abu-abu kosong
// yang terlihat seperti gambar gagal dimuat.
export function SampulPlaceholder() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-700 flex flex-col items-center justify-center gap-2">
      <Image src="/icon.svg" alt="" width={56} height={56} className="w-12 h-12 sm:w-14 sm:h-14 brightness-0 invert opacity-90" />
      <span className="text-white/80 text-[10px] sm:text-xs font-semibold tracking-widest uppercase">LPKBB Antareja</span>
    </div>
  );
}

export default function BeritaCard({ berita: b }: { berita: Berita }) {
  return (
    <Link
      href={`/berita/${b.slug}`}
      className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
    >
      <div className="relative aspect-video bg-gray-100 overflow-hidden">
        {b.coverUrl ? (
          <Image
            src={b.coverUrl}
            alt={b.judul}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <SampulPlaceholder />
        )}
      </div>
      <div className="p-4 sm:p-5 flex flex-col gap-2 flex-1">
        <span className="text-xs text-gray-400">{formatTanggalBerita(b.publishedAt)}</span>
        <h3 className="font-bold leading-snug group-hover:text-primary-500 transition-colors">{b.judul}</h3>
        {b.ringkasan && <p className="text-sm text-neutral-600 line-clamp-3">{b.ringkasan}</p>}
      </div>
    </Link>
  );
}
