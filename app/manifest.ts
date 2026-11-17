import type { MetadataRoute } from "next"
import { SITE_NAME } from "@/lib/brand"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: "Akordi i tekstovi pesama, hvatovi i tvoje plejliste za sviranje.",
    lang: "sr-Latn",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#111111",
    theme_color: "#111111",
    prefer_related_applications: false,
    categories: ["music", "education"],
    icons: [
      { src: "/pwa/icon-192.png?v=ga-1", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png?v=ga-1", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-maskable-512.png?v=ga-1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
