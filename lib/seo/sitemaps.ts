import { unstable_cache } from "next/cache"
import { encodeXML } from "entities"
import { prisma } from "@/lib/prisma"
import { hasBiographyContent } from "@/lib/biographies/catalog"
import { PUBLIC_CATEGORIES, publicUrl, routePath, SITE_URL } from "./site"

export const SITEMAP_BATCH_SIZE = 1000
export const sitemapStaticPaths = ["/", "/pesme", "/biografija", "/akordi", "/plejliste", "/o-nama", "/kontakt", "/foto-izvori", "/wiki-izvori", ...PUBLIC_CATEGORIES.flatMap(category => [routePath("pesme", category), routePath("biografija", category)])]
const where = { artist: { category: { in: [...PUBLIC_CATEGORIES] } }, lyrics: { not: "" } }
const counts = unstable_cache(async () => {
  const [songs, artists] = await Promise.all([prisma.song.count({ where }), prisma.artist.count({ where: { category: { in: [...PUBLIC_CATEGORIES] } } })])
  return { songs, artists }
}, ["seo-sitemap-counts-v1"], { revalidate: 300, tags: ["seo-sitemap"] })

export function sitemapFiles(songCount: number, artistCount: number) {
  if ([songCount, artistCount].some(count => !Number.isSafeInteger(count) || count < 0 || count > 10000000)) throw Error("Invalid public catalog size.")
  return ["pages.xml", ...Array.from({ length: Math.ceil(songCount / SITEMAP_BATCH_SIZE) }, (_, page) => `songs-${page}.xml`), ...Array.from({ length: Math.ceil(artistCount / SITEMAP_BATCH_SIZE) }, (_, page) => `artists-${page}.xml`)]
}
export const xmlUrlset = (urls: string[]) => `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(urls)].map(url => `<url><loc>${encodeXML(url)}</loc></url>`).join("")}</urlset>`
function catalogUrl(...segments: string[]) {
  try { return publicUrl(routePath(...segments)) }
  catch { return null }
}
export async function sitemapIndex() {
  const { songs, artists } = await counts()
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapFiles(songs, artists).map(file => `<sitemap><loc>${encodeXML(publicUrl("/sitemaps/" + file))}</loc></sitemap>`).join("")}</sitemapindex>`
}

const publicPage = unstable_cache(async (kind: "songs" | "artists", page: number) => {
  if (kind === "songs") {
    const songs = await prisma.song.findMany({ where, select: { slug: true, artist: { select: { slug: true, category: true } } }, orderBy: { id: "asc" }, skip: page * SITEMAP_BATCH_SIZE, take: SITEMAP_BATCH_SIZE })
    return songs.flatMap(song => {
      const url = song.artist.category ? catalogUrl("pesme", song.artist.category, song.artist.slug, song.slug) : null
      return url ? [url] : []
    })
  }
  const artists = await prisma.artist.findMany({ where: { category: { in: [...PUBLIC_CATEGORIES] } }, select: { slug: true, category: true, bio: true, bioShort: true, discography: true, _count: { select: { songs: true, performances: true } } }, orderBy: { id: "asc" }, skip: page * SITEMAP_BATCH_SIZE, take: SITEMAP_BATCH_SIZE })
  return artists.flatMap(artist => {
    if (!artist.category) return []
    const urls: string[] = []
    const songs = catalogUrl("pesme", artist.category, artist.slug), bio = catalogUrl("biografija", artist.category, artist.slug)
    if ((artist._count.songs || artist._count.performances) && songs) urls.push(songs)
    if (hasBiographyContent(artist) && bio) urls.push(bio)
    return urls
  })
}, ["seo-sitemap-pages-v1", SITE_URL], { revalidate: 300, tags: ["seo-sitemap"] })

export async function sitemapPage(file: string): Promise<string | null> {
  if (file === "pages.xml") return xmlUrlset(sitemapStaticPaths.map(publicUrl))
  const match = /^(songs|artists)-(0|[1-9]\d{0,5})\.xml$/.exec(file)
  if (!match) return null
  const kind = match[1] as "songs" | "artists", page = Number(match[2]), totals = await counts()
  if (page >= Math.ceil(totals[kind] / SITEMAP_BATCH_SIZE)) return null
  return xmlUrlset(await publicPage(kind, page))
}
export function sitemapResponse(xml: string) {
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600", "X-Content-Type-Options": "nosniff" } })
}
export function sitemapFailure() {
  return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60", "X-Robots-Tag": "noindex" } })
}
