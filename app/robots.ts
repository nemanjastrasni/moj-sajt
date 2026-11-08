import type { MetadataRoute } from "next"
import { publicUrl } from "@/lib/seo/site"

export default function robots(): MetadataRoute.Robots {
  if(process.env.VERCEL_ENV==="preview")return {rules:[{userAgent:"*",disallow:"/"}]}
  return {
    rules: [{ userAgent: "*", allow: ["/", "/api/popular", "/api/latest", "/api/songs/"],
      disallow: ["/admin", "/api/", "/profile", "/favorite", "/login", "/signin", "/signup", "/plejliste/pesme-koje-znam", "/plejliste/top-user", "/predlozi-pesmu", "/moji-predlozi", "/listening-playlist"] }],
    sitemap: publicUrl("/sitemap.xml"),
  }
}
