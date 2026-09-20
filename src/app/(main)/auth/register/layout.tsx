import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daftar Akun",
  description: "Buat akun LKBB Antareja 2026 lalu daftarkan tim terbaikmu untuk ikut lomba baris-berbaris tingkat Jawa Timur.",
};

export default function RegisterLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
