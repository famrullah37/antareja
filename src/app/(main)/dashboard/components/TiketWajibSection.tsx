import { H2 } from "@/app/components/global/Text";
import SectionWrapper from "@/app/components/global/Wrapper";
import Link from "next/link";
import { statusGabungan, type StatusTiketWajib } from "@/lib/tiketWajib";
import { namaTiket } from "@/lib/tiket";

export type ItemTiketWajib = {
  tiketId: string;
  jenis: string;
  jumlahPerTim: number;
  lunas: number;
  menunggu: number;
  status: StatusTiketWajib;
};

const LABEL: Record<StatusTiketWajib, { teks: string; kelas: string }> = {
  SUDAH: { teks: "Sudah dibeli", kelas: "bg-green-100 text-green-700" },
  MENUNGGU: { teks: "Menunggu verifikasi", kelas: "bg-yellow-100 text-yellow-700" },
  BELUM: { teks: "Belum dibeli", kelas: "bg-red-100 text-red-700" },
};

const KOTAK: Record<StatusTiketWajib, string> = {
  SUDAH: "bg-green-50 border-green-200 text-green-800",
  MENUNGGU: "bg-yellow-50 border-yellow-200 text-yellow-800",
  BELUM: "bg-red-50 border-red-200 text-red-800",
};

const PESAN: Record<StatusTiketWajib, string> = {
  SUDAH: "Tim kamu sudah membeli semua tiket wajib. QR code tiket dikirim ke email pemesan dan bisa dilihat di bagian Tiket Saya.",
  MENUNGGU: "Pesanan tiket wajib tim kamu sedang menunggu verifikasi pembayaran oleh panitia.",
  BELUM: "Tim kamu belum membeli semua tiket wajib. Tiket ini hanya bisa dibeli lewat akun tim ini.",
};

// Pengingat tiket wajib tim (Tiket.khususTim), status per jenis tiket. Tidak
// tampil kalau panitia belum menandai tiket apa pun sebagai wajib tim.
export default function TiketWajibSection({ items }: { items: ItemTiketWajib[] }) {
  if (items.length === 0) return null;
  const status = statusGabungan(items);
  // Tombol beli langsung membuka /tiket dengan tiket wajib pertama yang belum dibeli terpilih.
  const belum = items.find((it) => it.status === "BELUM");
  const linkBeli = belum ? `/tiket?pilih=${encodeURIComponent(belum.tiketId)}` : "/tiket";

  return (
    <SectionWrapper id="tiket-wajib">
      <H2 className="mb-2">Tiket Wajib Tim</H2>
      <div className={`border rounded-xl px-5 py-4 flex flex-col gap-3 ${KOTAK[status]}`}>
        <p className="text-sm">{PESAN[status]}</p>
        <ul className="flex flex-col gap-2">
          {items.map((it) => (
            <li key={it.jenis} className="flex flex-wrap items-center gap-2 text-sm text-gray-800">
              <span className="font-medium">
                {namaTiket(it.jenis)} — {it.jumlahPerTim} tiket
              </span>
              <span className={`text-xs font-semibold rounded px-2 py-0.5 ${LABEL[it.status].kelas}`}>
                {LABEL[it.status].teks}
              </span>
            </li>
          ))}
        </ul>
        {status === "BELUM" && (
          <Link
            href={linkBeli}
            className="self-start bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            Beli Tiket Wajib
          </Link>
        )}
      </div>
    </SectionWrapper>
  );
}
