import type { MetadataRoute } from "next"
import { publicUrl } from "@/lib/seo/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/api/popular", "/api/latest", "/api/songs/"],
      disallow: ["/admin", "/api/", "/profile", "/favorite", "/login", "/signup", "/predlozi-pesmu", "/moji-predlozi", "/listening-playlist"] }],
    sitemap: publicUrl("/sitemap.xml"),
  }
}
