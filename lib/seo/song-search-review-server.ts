import { cache } from "react"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { reviewedSongIds, songReviewRule, songSearchReviewSelect, resolveSongSearchReview, type SearchReviewSong } from "./song-search-review"

export const getSongSearchReview = cache(async (song: SearchReviewSong) => {
  const rule = songReviewRule(song)
  if (!rule) return null
  try {
    const target = await prisma.song.findFirst({ where: { id: rule.target.id }, select: songSearchReviewSelect })
    return resolveSongSearchReview(song, target ? [target] : [])
  } catch {
    // Optional cross-reference failure must not make a readable song fail.
    // A confirmed fragment remains incomplete even if its alternative is unavailable.
    return resolveSongSearchReview(song, [])
  }
})

export const getSitemapSongExclusions = unstable_cache(async () => {
  const songs = await prisma.song.findMany({ where: { id: { in: reviewedSongIds } }, select: songSearchReviewSelect })
  return songs.filter(song => resolveSongSearchReview(song, songs)).map(song => song.id)
}, ["song-search-review-exclusions-v1"], { revalidate: 300, tags: ["seo-sitemap"] })
