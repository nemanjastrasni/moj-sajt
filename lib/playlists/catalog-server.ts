import { unstable_cache } from "next/cache"
import { cache } from "react"
import { gzip, gunzip } from "node:zlib"
import { promisify } from "node:util"
import { createHash } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { difficultyLevels, estimateDifficulty, type Difficulty } from "../music/difficulty"
import { catalogEntries, catalogEntry, matchesCatalog } from "./catalog"
import { catalogSourceHash } from "./catalog-source"
import { catalogAssessmentRevision, savedCatalogAssessment } from "./catalog-snapshot"
import { Prisma } from "@prisma/client"

type CatalogCard = {
  id: string; title: string; slug: string; category: string
  artist: { name: string; slug: string }; level: Difficulty | null; catalogs: string[]
}
const compress = promisify(gzip), decompress = promisify(gunzip)
const PUBLIC_CATEGORIES = ["domace", "strane", "narodne"]
type CatalogIndex = { version: string; encoded: string; counts: Record<string, Record<string, number>> }
type CatalogSource = Omit<CatalogCard, "level" | "catalogs"> & { sourceHash: string }

// Assess the public catalog once for all categories for thirty minutes.
// Compression keeps the metadata index comfortably below the data-cache size limit.
// Full lyrics, chord bodies, accounts and personal settings never enter this cache.
async function buildCatalog(): Promise<CatalogIndex> {
  // Keep metadata/fingerprint and changed source reads in one consistent snapshot.
  // Parsing happens after the transaction has released its connection.
  const { rows, sources } = await prisma.$transaction(async tx => {
    const rows = await tx.$queryRaw<CatalogSource[]>(Prisma.sql`
      SELECT s.id,s.title,s.slug,s.category,${catalogSourceHash} AS "sourceHash",
        jsonb_build_object('name',a.name,'slug',a.slug) AS artist
      FROM public."Song" s JOIN public."Artist" a ON a.id=s."artistId"
      WHERE s.category IN (${Prisma.join(PUBLIC_CATEGORIES)})
      ORDER BY s.popularity DESC,s.title ASC,s.id ASC`)
    const changed = rows.filter(song => !savedCatalogAssessment(song.id, song.sourceHash)).map(song => song.id)
    const sources = changed.length ? await tx.song.findMany({
      where: { id: { in: changed } }, select: { id: true, lyrics: true, chords: true },
    }) : []
    return { rows, sources }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, maxWait: 5000, timeout: 15000 })
  const changedSources = new Map(sources.map(song => [song.id, song]))
  const cards: CatalogCard[] = rows.map(song => {
    const source = changedSources.get(song.id)
    const assessment = savedCatalogAssessment(song.id, song.sourceHash) ?? (source ? estimateDifficulty(source) : undefined)
    if (!assessment) throw Error("Catalog source snapshot is incomplete")
    return { id: song.id, title: song.title, slug: song.slug, category: song.category, artist: { name: song.artist.name, slug: song.artist.slug }, level: assessment.level,
      catalogs: catalogEntries.filter(entry => matchesCatalog(song, entry.slug, assessment)).map(entry => entry.slug) }
  })
  const counts: CatalogIndex["counts"] = Object.fromEntries(["all", ...PUBLIC_CATEGORIES].map(category => [category, {}]))
  for (const card of cards) {
    const selections = [...card.catalogs, ...difficultyLevels.flatMap((_, maximum) => card.level !== null && difficultyLevels.indexOf(card.level) <= maximum ? ["skill:" + maximum] : [])]
    for (const category of ["all", card.category]) for (const selection of selections) counts[category][selection] = (counts[category][selection] ?? 0) + 1
  }
  const zipped = await compress(JSON.stringify(cards))
  return { version: createHash("sha256").update(zipped).digest("hex"), encoded: zipped.toString("base64"), counts }
}

// Share only work currently in progress, including background cache refreshes.
// Completed snapshots remain governed by Next's TTL and admin invalidation tag.
let building: Promise<CatalogIndex> | null = null
function sharedBuild() {
  if (!building) {
    const pending = buildCatalog()
    building = pending
    const completed = () => { if (building === pending) building = null }
    void pending.then(completed, completed)
  }
  return building
}
const encodedCatalog = unstable_cache(sharedBuild, ["playlist-catalog-index-v4", catalogAssessmentRevision, JSON.stringify(catalogEntries)], { revalidate: 1800, tags: ["playlist-catalog"] })

export const catalogPage = cache(async (slug: string, category: string | null, page: number, maximumSkill: number | null = null) => {
  if (category !== null && !PUBLIC_CATEGORIES.includes(category) || maximumSkill === null && !catalogEntry(slug) || maximumSkill !== null && (!Number.isInteger(maximumSkill) || maximumSkill < 0 || maximumSkill >= difficultyLevels.length)) return { total: 0, pages: 1, current: 1, songs: [] as Omit<CatalogCard, "catalogs">[] }
  const selection = maximumSkill === null ? slug : "skill:" + maximumSkill
  // Read the shared index outside the page cache: nested unstable_cache calls
  // bypass the inner cache in Next 15 and would repeat the expensive assessment.
  const index = await encodedCatalog()
  const total = index.counts[category ?? "all"][selection] ?? 0, pages = Math.max(1, Math.ceil(total / 50))
  const current = Math.min(pages, Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1)
  // Include the source revision so a refreshed index cannot serve an older page.
  // Only finite public filters and the actual clamped page enter the cache key.
  return unstable_cache(async () => {
    const cards: CatalogCard[] = JSON.parse((await decompress(Buffer.from(index.encoded, "base64"))).toString("utf8"))
    const filtered = cards.filter(song => (category === null || song.category === category) && (maximumSkill === null ? song.catalogs.includes(slug) : song.level !== null && difficultyLevels.indexOf(song.level) <= maximumSkill))
    return { total, pages, current, songs: filtered.slice((current - 1) * 50, current * 50).map(song => ({ id: song.id, title: song.title, slug: song.slug, category: song.category, artist: song.artist, level: song.level })) }
  }, ["playlist-catalog-page-v1", index.version, selection, category ?? "all", String(current)], { revalidate: 1800, tags: ["playlist-catalog"] })()
})

export function catalogPageNumber(value: unknown) {
  return typeof value === "string" && /^[1-9]\d{0,5}$/.test(value) ? Math.min(1000, Number(value)) : 1
}
