import { sitemapFailure, sitemapIndex, sitemapResponse } from "@/lib/seo/sitemaps"
export const dynamic = "force-dynamic"
export async function GET() {
  try { return sitemapResponse(await sitemapIndex()) }
  catch { return sitemapFailure() }
}
