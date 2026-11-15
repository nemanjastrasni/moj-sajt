import { cache } from "react"
import { permanentRedirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { isPublicCategory, routePath } from "@/lib/seo/site"

type MergeRecord = { subjectId: string; target: { id: string; slug: string; category: string }; moves: { id: string; oldSlug: string }[] }
// Queried only after a normal lookup misses, using the existing findingId index.
const record = cache(async (category: string, slug: string) => {
  const rows = await prisma.$queryRawUnsafe<MergeRecord[]>('SELECT "subjectId",data->\'after\' AS target,data->\'moves\' AS moves FROM public."AdminContentProposal" WHERE "findingId"=$1 AND field=\'artist-merge\' AND operation=\'merge\' AND status=\'applied\' ORDER BY "createdAt" DESC,id DESC LIMIT 1', "artist-merge:" + category + "/" + slug)
  return rows[0]
})
export async function mergedArtistHref(category: string, slug: string, kind: "artist" | "bio" | "info" | "song" = "artist", songSlug?: string): Promise<string | null> {
  if (!isPublicCategory(category) || slug.length > 250 || (songSlug?.length ?? 0) > 300) return null
  let merge = await record(category, slug)
  if (!merge) return null
  if (kind === "song") {
    const move = merge.moves.find(s => s.oldSlug === songSlug)
    if (!move) return null
    const song = await prisma.song.findUnique({ where: { id: move.id }, select: { slug: true, artist: { select: { category: true, slug: true } } } })
    return song?.artist.category ? routePath("pesme", song.artist.category, song.artist.slug, song.slug) : null
  }
  const visited = new Set<string>()
  for (let depth = 0; depth < 12; depth++) {
    if (visited.has(merge.subjectId)) return null
    visited.add(merge.subjectId)
    const target = await prisma.artist.findUnique({ where: { id: merge.subjectId }, select: { category: true, slug: true } })
    if (target?.category) return routePath(kind === "bio" ? "biografija" : "pesme", target.category, target.slug) + (kind === "info" ? "/info" : "")
    merge = await record(merge.target.category, merge.target.slug)
    if (!merge) return null
  }
  return null
}
export async function redirectMergedArtist(category: string, slug: string, kind: "artist" | "bio" | "info" | "song" = "artist", songSlug?: string, query?: Record<string, string | string[] | undefined>) {
  const href = await mergedArtistHref(category, slug, kind, songSlug)
  if (href) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query ?? {})) {
      for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, item)
    }
    permanentRedirect(href + (params.size ? "?" + params.toString() : ""))
  }
}
