import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Juri hanya halaman input nilai — "/admin/penilaian-baru" (konfigurasi + ranking
// semua tim) memuat nama sekolah & nilai juri lain.
const JURI_ROUTES = ["/admin/penilaian-baru/input"];
// Petugas tiket hanya POS (bukan manajemen tiket, verifikasi pembayaran, atau scanner).
const TIKET_ROUTES = ["/admin/tiket/pos", "/admin/pos-produk/kasir"];
const BENDAHARA_ROUTES = ["/admin/kas", "/admin/kuitansi","/admin/pembayaran", "/admin/voting", "/admin/merchandise", "/admin/pos-produk", "/admin/tiket", "/admin/makanan", "/admin/galeri/transaksi", "/admin/galeri/bagi-hasil"];
const FOTOGRAFER_ROUTES = ["/admin/galeri"];
const SIE_HUMAS_ROUTES = ["/admin/sponsor", "/admin/berita"];
const SIE_LOMBA_ROUTES = [
  "/admin/tim",
  "/admin/presensi-dp",
  "/admin/juri",
  "/admin/penilaian-baru",
  "/admin/penghargaan",
  "/admin/sertifikat",
  "/admin/pengumuman",
];
// Pelaksanaan acara: jadwal uji coba, akomodasi & ruangan. Sengaja tanpa
// tim/juri/penilaian — data anggota & nilai bukan urusan Sie Acara.
const SIE_ACARA_ROUTES = ["/admin/uji-coba", "/admin/menginap", "/admin/basecamp", "/admin/pengumuman", "/admin/makanan"];

const STAFF_ROUTES: Record<string, string[]> = {
  JURI: JURI_ROUTES,
  TIKET: TIKET_ROUTES,
  BENDAHARA: BENDAHARA_ROUTES,
  FOTOGRAFER: FOTOGRAFER_ROUTES,
  SIE_LOMBA: SIE_LOMBA_ROUTES,
  SIE_HUMAS: SIE_HUMAS_ROUTES,
  SIE_ACARA: SIE_ACARA_ROUTES,
};

// Halaman awal staf = route pertama yang boleh dia buka. "/admin" (dashboard)
// khusus ADMIN, jadi staf yang membuka "/admin" atau "/dashboard" diarahkan ke
// sini, bukan ditendang ke landing page.
const STAFF_HOME: Record<string, string> = {
  JURI: "/admin/penilaian-baru/input",
  TIKET: "/admin/tiket/pos",
  BENDAHARA: "/admin/pembayaran",
  FOTOGRAFER: "/admin/galeri",
  SIE_LOMBA: "/admin/tim",
  SIE_HUMAS: "/admin/sponsor",
  SIE_ACARA: "/admin/menginap",
};

// Sengaja tidak memakai withAuth: redirect bawaannya menambah
// ?callbackUrl=<halaman asal> ke URL login, padahal halaman login menentukan
// tujuan dari role (bukan callbackUrl) — hasilnya URL login panjang & bersarang.
export default async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.redirect(new URL("/auth/login", req.url));

  const pathname = req.nextUrl.pathname;
  const role = token.role as string;

  if (pathname.startsWith("/dashboard")) {
    if (role !== "USER") {
      return NextResponse.redirect(new URL(STAFF_HOME[role] ?? "/admin", req.url));
    }
    return NextResponse.next();
  }

  // Sistem penilaian LAMA (single-admin, tabel Penilaian) sudah diganti
  // /admin/penilaian-baru — dialihkan untuk semua role supaya pengguna tidak
  // bingung ada dua menu penilaian. Kodenya dibersihkan setelah lomba.
  if (pathname === "/admin/penilaian" || pathname.startsWith("/admin/penilaian/")) {
    const tujuan = role === "ADMIN" || role === "SIE_LOMBA" ? "/admin/penilaian-baru" : STAFF_HOME[role] ?? "/";
    return NextResponse.redirect(new URL(tujuan, req.url));
  }

  if (pathname.startsWith("/admin")) {
    if (role === "ADMIN") return NextResponse.next();
    // Cocokkan per segmen: "/admin/tim" boleh "/admin/tim/123", tapi bukan
    // route lain yang kebetulan berawalan sama (mis. "/admin/timeline").
    if (STAFF_ROUTES[role]?.some((r) => pathname === r || pathname.startsWith(r + "/")))
      return NextResponse.next();
    return NextResponse.redirect(new URL(STAFF_HOME[role] ?? "/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
