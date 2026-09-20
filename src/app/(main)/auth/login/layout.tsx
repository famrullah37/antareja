import type { Metadata } from "next";

// Halaman login tidak untuk mesin pencari (juga dilarang lewat header X-Robots-Tag & robots.txt).
export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke akun LKBB Antareja untuk mengelola tim dan pendaftaranmu.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
