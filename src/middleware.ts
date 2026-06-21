import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const JURI_ROUTES = ["/admin/penilaian", "/admin/penilaian-baru"];
const TIKET_ROUTES = ["/admin/tiket"];
const BENDAHARA_ROUTES = ["/admin/kas", "/admin/pembayaran"];
const FOTOGRAFER_ROUTES = ["/admin/galeri"];

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    const role = token?.role as string;

    if (pathname.startsWith("/dashboard")) {
      if (role !== "USER") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.next();
    }

    if (pathname.startsWith("/admin")) {
      if (role === "ADMIN") return NextResponse.next();
      if (role === "JURI" && JURI_ROUTES.some((r) => pathname.startsWith(r))) return NextResponse.next();
      if (role === "TIKET" && TIKET_ROUTES.some((r) => pathname.startsWith(r))) return NextResponse.next();
      if (role === "BENDAHARA" && BENDAHARA_ROUTES.some((r) => pathname.startsWith(r))) return NextResponse.next();
      if (role === "FOTOGRAFER" && FOTOGRAFER_ROUTES.some((r) => pathname.startsWith(r))) return NextResponse.next();
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
