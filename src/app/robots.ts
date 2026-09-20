import { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Halaman privat / tanpa nilai pencarian (masuk, dashboard, admin, tautan unduhan pribadi, API).
      disallow: ["/admin/", "/dashboard", "/form", "/confirmation", "/auth/login", "/auth/verify", "/galeri/download/", "/api/", "/juri/"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
