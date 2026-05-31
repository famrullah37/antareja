import { withAuth } from "next-auth/middleware";

const JURI_ROUTES = ["/admin/penilaian", "/admin/penilaian-baru"];
const TIKET_ROUTES = ["/admin/tiket"];
const BENDAHARA_ROUTES = ["/admin/kas"];

export default withAuth(function middleware() {}, {
  callbacks: {
    authorized: ({ req, token }) => {
      if (!token) return false;
      const pathname = req.nextUrl.pathname;
      const role = token.role as string;

      if (pathname.startsWith("/dashboard")) return role === "USER";

      if (!pathname.startsWith("/admin")) return true;

      if (role === "ADMIN") return true;

      if (role === "JURI") return JURI_ROUTES.some((r) => pathname.startsWith(r));
      if (role === "TIKET") return TIKET_ROUTES.some((r) => pathname.startsWith(r));
      if (role === "BENDAHARA") return BENDAHARA_ROUTES.some((r) => pathname.startsWith(r));

      return false;
    },
  },
});

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
