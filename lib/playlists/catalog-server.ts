import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { difficultyLevels, estimateDifficulty } from "../music/difficulty"
import { matchesCatalog } from "./catalog"

// Cache only one public page of metadata, never accounts or complete lyric bodies.
export const catalogPage = unstable_cache(async (slug: string, category: string | null, page: number, maximumSkill: number | null = null) => {
  const rows = await prisma.song.findMany({
    where: { category: category ?? { in: ["domace", "strane", "narodne"] } },
    select: { id: true, title: true, slug: true, category: true, lyrics: true, chords: true, artist: { select: { name: true, slug: true } } },
    orderBy: [{ popularity: "desc" }, { title: "asc" }, { id: "asc" }],
  })
  const filtered = rows.map(song => ({ song, assessment: estimateDifficulty(song) })).filter(({ song, assessment }) => maximumSkill === null ? matchesCatalog(song, slug, assessment) : assessment.level !== null && difficultyLevels.indexOf(assessment.level) <= maximumSkill)
  const pages = Math.max(1, Math.ceil(filtered.length / 50)), current = Math.min(pages, Math.max(1, page))
  return {
    total: filtered.length, pages, current,
    songs: filtered.slice((current - 1) * 50, current * 50).map(({ song, assessment }) => ({ id: song.id, title: song.title, slug: song.slug, category: song.category, artist: song.artist, level: assessment.level })),
  }
}, ["playlist-catalog-v1"], { revalidate: 60, tags: ["playlist-catalog"] })

export function catalogPageNumber(value: unknown) {
  return typeof value === "string" && /^[1-9]\d{0,5}$/.test(value) ? Math.min(1000, Number(value)) : 1
}
