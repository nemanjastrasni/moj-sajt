import { cache } from "react"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { isPublicCategory, PUBLIC_CATEGORIES } from "@/lib/seo/site"
import { getSitemapSongExclusions } from "@/lib/seo/song-search-review-server"
import { songSearchReviewRevision } from "@/lib/seo/song-search-review"
import type { HomeSong } from "./homeSongs"

async function readSongs(category: string, excluded: string[]): Promise<HomeSong[]> {
  const songs = await prisma.song.findMany({
    where: { category, artist: { category: { in: [...PUBLIC_CATEGORIES] } }, ...(excluded.length ? { id: { notIn: excluded } } : {}) },
    select: { id: true, title: true, slug: true, category: true, artist: { select: { name: true, slug: true, category: true } } },
    orderBy: [{ popularity: "desc" }, { id: "asc" }],
    take: 50,
  })
  return songs.map(song => ({ id: song.id, title: song.title, slug: song.slug, category: song.artist.category ?? song.category, artist: { name: song.artist.name, slug: song.artist.slug } }))
}

const cachedSongs = unstable_cache(readSongs, ["public-top-songs-v1", songSearchReviewRevision], {
  revalidate: 60, tags: ["public-home-songs", "seo-sitemap"],
})

export const readTopSongs = cache(async (category: string): Promise<HomeSong[]> => {
  if (!isPublicCategory(category)) return []
  let excluded: string[]
  try {
    // Use the existing full-content/identity checks, not IDs alone. Read the
    // review cache outside cachedSongs: Next 15 may bypass nested data caches.
    excluded = [...new Set(await getSitemapSongExclusions())].sort()
  } catch {
    // An optional editorial lookup must not hide an otherwise readable list.
    // Avoid caching this fallback so a recovered review is retried immediately.
    return readSongs(category, [])
  }
  return cachedSongs(category, excluded)
})
