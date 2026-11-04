import { H2 } from "@/app/components/global/Text";
import SectionWrapper from "@/app/components/global/Wrapper";
import Link from "next/link";

// Pengingat tiket wajib tim (Tiket.khususTim). Tidak tampil kalau panitia
// belum menandai tiket apa pun sebagai wajib tim. Status dihitung dari
// transaksi akun tim ini (PENDING/VERIFIED; REJECTED diabaikan).
export default function TiketWajibSection({
  jenisWajib,
  lunas,
  menunggu,
}: {
  jenisWajib: string[];
  lunas: number;
  menunggu: number;
}) {
  if (jenisWajib.length === 0) return null;
  const daftarJenis = jenisWajib.map((j) => `Tiket ${j}`).join(", ");

  return (
    <SectionWrapper id="tiket-wajib">
      <H2 className="mb-2">Tiket Wajib Tim</H2>
      {lunas > 0 ? (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 text-sm">
          Tim kamu sudah membeli tiket wajib ({lunas} tiket terverifikasi). QR code tiket dikirim ke email pemesan
          dan bisa dilihat di bagian Tiket Saya.
        </div>
      ) : menunggu > 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4 text-sm">
          Pesanan tiket wajib tim kamu ({menunggu} tiket) sedang menunggu verifikasi pembayaran oleh panitia.
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <p className="text-sm text-red-800">
            Tim kamu <b>belum membeli tiket wajib</b> ({daftarJenis}). Tiket ini hanya bisa dibeli lewat akun tim
            ini.
          </p>
          <Link
            href="/tiket"
            className="shrink-0 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors text-center"
          >
            Beli Tiket Wajib
          </Link>
        </div>
      )}
    </SectionWrapper>
  );
}
