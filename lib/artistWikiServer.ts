import { cache } from "react"
import { prisma } from "@/lib/prisma"
import { artistWikiManifest, wikiValueHash, type WikiArtist, type WikiSource } from "./artistWiki"

type StoredCredit = { artistId: string; artistName: string; slug: string; category: string | null; wikidataId: string; bioSource: WikiSource | null; discographySource: WikiSource | null; bio: string | null; discography: unknown }
const toCredit = (row: StoredCredit): WikiArtist => ({ artistId: row.artistId, artistName: row.artistName, slug: row.slug, category: row.category, wikidataId: row.wikidataId,
  ...(row.bioSource?.hash === wikiValueHash(row.bio) ? { bio: row.bioSource } : {}),
  ...(row.discographySource?.hash === wikiValueHash(row.discography) ? { discography: row.discographySource } : {}) })
const query = `SELECT p.*,a.category,a.bio,a.discography FROM public."ArtistWikiProfile" p JOIN public."Artist" a ON a.id=p."artistId" WHERE a.name=p."artistName" AND a.slug=p.slug`
export const artistWikiCredit = cache(async (artistId: string): Promise<WikiArtist | undefined> => {
  const fallback = artistWikiManifest.artists.find(a => a.artistId === artistId)
  try {
    const rows = await prisma.$queryRawUnsafe<StoredCredit[]>(query + ' AND p."artistId"=$1', artistId)
    if (rows[0]) return { ...fallback, ...toCredit(rows[0]) }
  } catch { /* Deploys can precede the optional source table; existing credits remain valid. */ }
  return fallback
})
export const allArtistWikiCredits = cache(async (): Promise<WikiArtist[]> => {
  const entries = new Map(artistWikiManifest.artists.map(a => [a.artistId, a]))
  try {
    const rows = await prisma.$queryRawUnsafe<StoredCredit[]>(query)
    for (const row of rows) entries.set(row.artistId, { ...entries.get(row.artistId), ...toCredit(row) })
  } catch {}
  return [...entries.values()].filter(a => a.bio || a.discography).sort((a,b) => a.artistName.localeCompare(b.artistName,"sr-Latn"))
})
