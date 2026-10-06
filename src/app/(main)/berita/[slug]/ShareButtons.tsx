"use client";

import { useEffect, useState } from "react";
import { FaFacebookF, FaLink, FaWhatsapp, FaXTwitter } from "react-icons/fa6";
import { FiShare2 } from "react-icons/fi";
import { toast } from "sonner";

// Di HP: grid 2 kolom, tombol sama lebar & cukup besar untuk jempol (min 44px).
// Mulai sm: berjejer biasa.
const btn =
  "inline-flex items-center justify-center gap-2 px-4 min-h-[44px] sm:min-h-0 sm:py-2 rounded-xl text-sm font-semibold transition-colors";

export default function ShareButtons({ url, judul }: { url: string; judul: string }) {
  // navigator.share hanya ada di browser (umumnya HP) — dicek setelah mount
  // supaya HTML server & client sama.
  const [bisaShareNative, setBisaShareNative] = useState(false);
  useEffect(() => setBisaShareNative(typeof navigator !== "undefined" && !!navigator.share), []);

  const u = encodeURIComponent(url);
  const teks = encodeURIComponent(`${judul}\n${url}`);

  async function salinLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link disalin");
    } catch {
      toast.error("Gagal menyalin link");
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-gray-200 pt-6">
      <span className="text-sm font-semibold text-neutral-700">Bagikan berita ini</span>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {bisaShareNative && (
          <button
            type="button"
            onClick={() => navigator.share({ title: judul, url }).catch(() => {})}
            className={`${btn} col-span-2 bg-primary-500 text-white hover:bg-primary-600`}
          >
            <FiShare2 /> Bagikan
          </button>
        )}
        <a
          href={`https://wa.me/?text=${teks}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btn} bg-[#25D366] text-white hover:opacity-90`}
        >
          <FaWhatsapp /> WhatsApp
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${u}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btn} bg-[#1877F2] text-white hover:opacity-90`}
        >
          <FaFacebookF /> Facebook
        </a>
        <a
          href={`https://twitter.com/intent/tweet?url=${u}&text=${encodeURIComponent(judul)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btn} bg-black text-white hover:opacity-90`}
        >
          <FaXTwitter /> X
        </a>
        <button type="button" onClick={salinLink} className={`${btn} bg-neutral-100 text-neutral-700 hover:bg-neutral-200`}>
          <FaLink /> Salin link
        </button>
      </div>
    </div>
  );
}
