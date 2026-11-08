import type { NextConfig } from "next";
import legacyRedirects from "./lib/seo/legacy-redirects.json";
import { domainRedirects } from "./lib/seo/domain.cjs";

const nextConfig: NextConfig = {
  async redirects() {
    return [...domainRedirects(process.env), ...legacyRedirects];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      ...(process.env.VERCEL_ENV === "preview" ? [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }] : []),
      { source: "/images/optimized/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      ...["/admin/:path*", "/api/:path*", "/profile/:path*", "/favorite", "/plejliste/pesme-koje-znam", "/plejliste/top-user", "/signin", "/login", "/signup", "/predlozi-pesmu", "/moji-predlozi", "/listening-playlist/:path*"].map(source => ({ source, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] })),
    ]
  },
};

export default nextConfig;
