import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const JURI_ROUTES = ["/admin/penilaian", "/admin/penilaian-baru"];
const TIKET_ROUTES = ["/admin/tiket"];
const BENDAHARA_ROUTES = ["/admin/kas", "/admin/pembayaran", "/admin/voting"];
const FOTOGRAFER_ROUTES = ["/admin/galeri"];
const SIE_LOMBA_ROUTES = [
  "/admin/tim",
  "/admin/juri",
  "/admin/penilaian",
  "/admin/penilaian-baru",
  "/admin/penghargaan",
  "/admin/sertifikat",
  "/admin/pengumuman",
  "/admin/uji-coba",
];

const STAFF_ROUTES: Record<string, string[]> = {
  JURI: JURI_ROUTES,
  TIKET: TIKET_ROUTES,
  BENDAHARA: BENDAHARA_ROUTES,
  FOTOGRAFER: FOTOGRAFER_ROUTES,
  SIE_LOMBA: SIE_LOMBA_ROUTES,
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
