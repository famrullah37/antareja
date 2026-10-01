/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // 20mb: cukup untuk sertifikat scan (maks 15MB/file di validateUploadFile)
      // dan beberapa foto kamera event sekaligus. Ini batas TOTAL body request
      // (semua file dalam satu submit digabung) — upload sertifikat/galeri
      // banyak file besar sekaligus tetap bisa kena limit ini meski tiap file
      // di bawah cap masing-masing.
      bodySizeLimit: "20mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  // Halaman privat tidak boleh masuk indeks mesin pencari (berlapis dengan robots.txt: robots.txt cuma
  // meminta crawler tidak merayap, header ini melarang mengindeks walau URL-nya ditemukan dari tempat lain).
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    // Header keamanan dasar untuk semua halaman: cegah situs dimuat di iframe
    // situs lain (clickjacking), cegah browser menebak tipe file, batasi
    // Referer ke situs lain, dan paksa HTTPS (Traefik sudah melayani TLS).
    const security = [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    return [
      { source: "/:path*", headers: security },
      ...[
        "/admin/:path*",
        "/dashboard/:path*",
        "/form",
        "/confirmation",
        "/auth/login",
        "/auth/verify",
        "/galeri/download/:path*",
      ].map((source) => ({ source, headers: noindex })),
    ];
  },
};

export default nextConfig;
