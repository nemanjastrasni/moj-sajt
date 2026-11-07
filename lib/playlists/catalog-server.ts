import { unstable_cache } from "next/cache"
import { cache } from "react"
import { gzip, gunzip } from "node:zlib"
import { promisify } from "node:util"
import { prisma } from "@/lib/prisma"
import { difficultyLevels, estimateDifficulty, type Difficulty } from "../music/difficulty"
import { catalogEntries, matchesCatalog } from "./catalog"

type CatalogCard = {
  id: string; title: string; slug: string; category: string
  artist: { name: string; slug: string }; level: Difficulty | null; catalogs: string[]
}
const compress = promisify(gzip), decompress = promisify(gunzip)

// Reuse the same public assessments across filters/pages for one minute.
// Compression keeps the metadata index comfortably below the data-cache size limit.
// Full lyrics, chord bodies, accounts and personal settings never enter this cache.
async function buildCatalog(category: string | null) {
  const rows = await prisma.song.findMany({
    where: { category: category ?? { in: ["domace", "strane", "narodne"] } },
    select: { id: true, title: true, slug: true, category: true, lyrics: true, chords: true, artist: { select: { name: true, slug: true } } },
    orderBy: [{ popularity: "desc" }, { title: "asc" }, { id: "asc" }],
  })
  const cards: CatalogCard[] = rows.map(song => {
    const assessment = estimateDifficulty(song)
    return { id: song.id, title: song.title, slug: song.slug, category: song.category, artist: { name: song.artist.name, slug: song.artist.slug }, level: assessment.level,
      catalogs: catalogEntries.filter(entry => matchesCatalog(song, entry.slug, assessment)).map(entry => entry.slug) }
  })
  return (await compress(JSON.stringify(cards))).toString("base64")
}

// Share only work currently in progress, including background cache refreshes.
// Completed snapshots remain governed by Next's TTL and admin invalidation tag.
const building = new Map<string | null, Promise<string>>()
function sharedBuild(category: string | null) {
  let pending = building.get(category)
  if (!pending) {
    pending = buildCatalog(category)
    building.set(category, pending)
    const completed = () => { if (building.get(category) === pending) building.delete(category) }
    void pending.then(completed, completed)
  }
  return pending
}
const encodedCatalog = unstable_cache(sharedBuild, ["playlist-catalog-index-v2", JSON.stringify(catalogEntries)], { revalidate: 60, tags: ["playlist-catalog"] })

// Decode once per RSC request, shared by its metadata and rendered catalog.
const readCatalog = cache(async (category: string | null): Promise<CatalogCard[]> =>
  JSON.parse((await decompress(Buffer.from(await encodedCatalog(category), "base64"))).toString("utf8")))

export const catalogPage = cache(async (slug: string, category: string | null, page: number, maximumSkill: number | null = null) => {
  const filtered = (await readCatalog(category)).filter(song => maximumSkill === null ? song.catalogs.includes(slug) : song.level !== null && difficultyLevels.indexOf(song.level) <= maximumSkill)
  const pages = Math.max(1, Math.ceil(filtered.length / 50)), current = Math.min(pages, Math.max(1, page))
  return {
    total: filtered.length, pages, current,
    songs: filtered.slice((current - 1) * 50, current * 50).map(song => ({ id: song.id, title: song.title, slug: song.slug, category: song.category, artist: song.artist, level: song.level })),
  }
})

export function catalogPageNumber(value: unknown) {
  return typeof value === "string" && /^[1-9]\d{0,5}$/.test(value) ? Math.min(1000, Number(value)) : 1
}
