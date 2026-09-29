import { FaWhatsapp } from "react-icons/fa";
import { siteConfig } from "@/config/site";

export const whatsappUrl = `https://wa.me/${siteConfig.whatsapp.number}?text=${encodeURIComponent(
  siteConfig.whatsapp.message
)}`;

// Tombol WhatsApp mengambang di pojok kanan bawah — tampil di landing page & dashboard user
// (dipasang di layout (main)), untuk mengalihkan pertanyaan ke nomor resmi panitia.
export default function WhatsAppButton() {
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Hubungi panitia via WhatsApp ${siteConfig.whatsapp.display}`}
      title={`Ada pertanyaan? Chat WhatsApp ${siteConfig.whatsapp.display}`}
      className="group fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 rounded-full bg-[#25D366] p-3 sm:p-3.5 text-white shadow-lg shadow-black/20 transition-all duration-300 hover:bg-[#1EBE5A] hover:shadow-xl"
    >
      {/* Efek berkedip: cincin hijau yang terus memancar di belakang tombol. */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 rounded-full bg-[#25D366] opacity-75 animate-ping motion-reduce:animate-none"
      />
      <FaWhatsapp className="text-[28px] sm:text-[32px]" />
      <span className="hidden sm:group-hover:inline pr-1 text-sm font-semibold whitespace-nowrap">
        Ada pertanyaan? Chat kami
      </span>
    </a>
  );
}
