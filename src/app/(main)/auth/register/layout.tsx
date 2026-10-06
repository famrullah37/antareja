import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pendaftaran Lomba Paskibra",
  description: "Buat akun LPKBB Antareja 2026 lalu daftarkan tim terbaikmu untuk ikut lomba baris-berbaris tingkat Jawa Timur.",
};

export default function RegisterLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
