import { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

// Hanya halaman publik yang layak muncul di mesin pencari.
const routes: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/galeri", priority: 0.8, changeFrequency: "weekly" },
  { path: "/vote", priority: 0.7, changeFrequency: "daily" },
  { path: "/tiket", priority: 0.7, changeFrequency: "weekly" },
  { path: "/auth/register", priority: 0.6, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map((r) => ({
    url: `${siteConfig.url}${r.path === "/" ? "" : r.path}`,
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
