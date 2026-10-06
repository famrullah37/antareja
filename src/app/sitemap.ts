import { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { findBeritas } from "@/queries/berita.query";

// Dibangun per request (bukan saat build): daftar berita dari database, dan
// database tidak tersedia saat `next build` di Docker.
export const dynamic = "force-dynamic";

// Hanya halaman publik yang layak muncul di mesin pencari.
const routes: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/galeri", priority: 0.8, changeFrequency: "weekly" },
  { path: "/berita", priority: 0.8, changeFrequency: "weekly" },
  { path: "/vote", priority: 0.7, changeFrequency: "daily" },
  { path: "/tiket", priority: 0.7, changeFrequency: "weekly" },
  { path: "/auth/register", priority: 0.6, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const statis = routes.map((r) => ({
    url: `${siteConfig.url}${r.path === "/" ? "" : r.path}`,
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Tiap artikel berita = halaman baru yang bisa diindeks Google. Kalau database
  // gagal, sitemap halaman statis tetap dikirim.
  const beritas = await findBeritas({ publish: true }).catch(() => []);
  const berita = beritas.map((b) => ({
    url: `${siteConfig.url}/berita/${b.slug}`,
    lastModified: b.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...statis, ...berita];
}
