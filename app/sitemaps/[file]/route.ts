import { sitemapFailure, sitemapPage, sitemapResponse } from "@/lib/seo/sitemaps"
export const dynamic = "force-dynamic"
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  try {
    const xml = await sitemapPage((await params).file)
    return xml === null ? new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } }) : sitemapResponse(xml)
  } catch { return sitemapFailure() }
}
