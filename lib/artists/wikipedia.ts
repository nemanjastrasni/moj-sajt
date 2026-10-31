import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import type { WikiSource } from "@/lib/artistWiki"
import type { Album } from "@/lib/discography"
import { discoverContent, wikipediaClient, planBio } from "@/scripts/lib/artist-wiki-core.cjs"
import { credit, validSource, eligibleDiscography, saveProfile } from "@/scripts/lib/artist-wiki-store.cjs"

type SourceProfile = { wikidataId: string | null; state: string; checkedAt: Date }
type Proposal = { state: string; wikidataId?: string; bio?: string | null; bioSource?: Omit<WikiSource,"hash"> | null; discography?: Album[]; discographySource?: Omit<WikiSource,"hash"> | null }
const adapter = (client: Pick<typeof prisma, "$queryRawUnsafe">) => ({ query: async (sql: string, values: unknown[] = []) => {
  const rows = await client.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...values)
  return { rows, rowCount: rows.length }
} })
export async function enrichArtistWikipedia(artistId: string) {
  const profiles = await prisma.$queryRawUnsafe<SourceProfile[]>('SELECT "wikidataId",state,"checkedAt" FROM public."ArtistWikiProfile" WHERE "artistId"=$1', artistId)
  const previous = profiles[0]
  if (previous && !["pending", "working"].includes(previous.state) && Date.now() - new Date(previous.checkedAt).getTime() < 86400000) return
  // A database lease prevents duplicate lookups from simultaneous requests.
  const lease = await prisma.$queryRawUnsafe<{ artistId: string }[]>(`UPDATE public."ArtistWikiProfile" SET state='working',"checkedAt"=CURRENT_TIMESTAMP WHERE "artistId"=$1 AND (state<>'working' OR "checkedAt" < CURRENT_TIMESTAMP-INTERVAL '5 minutes') RETURNING "artistId"`, artistId)
  if (!lease.length) return
  const artist = await prisma.artist.findUnique({ where: { id: artistId } })
  if (!artist) return
  const client = wikipediaClient(undefined)
  client.deadline = Date.now() + 45000
  let proposal: Proposal
  try { proposal = await discoverContent({ ...artist, wikidataId: previous?.wikidataId }, client, { includeOtherAlbums: true }) }
  catch { proposal = { state: "request-failed" } }
  await prisma.$transaction(async tx => {
    const rows = await tx.$queryRawUnsafe<(typeof artist)[]>('SELECT * FROM public."Artist" WHERE id=$1 FOR UPDATE', artist.id)
    const current = rows[0]
    if (!current || current.name !== artist.name || current.slug !== artist.slug) return
    const sources: Record<string, unknown> = {}, update: Prisma.ArtistUpdateInput = {}
    const bio = planBio(current.bio, proposal.bio)
    if (bio.action === "replace" && validSource(proposal.bioSource)) { update.bio = bio.value; sources.bio = credit(bio.value, proposal.bioSource) }
    const emptyDiscography = current.discography == null || Array.isArray(current.discography) && current.discography.length === 0
    if (emptyDiscography && eligibleDiscography(proposal.discography) && validSource(proposal.discographySource)) { update.discography = proposal.discography as Prisma.InputJsonValue; sources.discography = credit(proposal.discography, proposal.discographySource) }
    if (Object.keys(update).length) await tx.artist.update({ where: { id: artist.id }, data: update })
    await saveProfile(adapter(tx), current, proposal, sources)
  })
  for (const path of ["/biografija", "/wiki-izvori", `/biografija/${artist.category}/${artist.slug}`, `/pesme/${artist.category}/${artist.slug}`]) revalidatePath(path)
}
export function queueArtistWikipedia(artistId: string) {
  try { after(async () => {
    try { await enrichArtistWikipedia(artistId) }
    catch { console.warn("Wikipedia enrichment deferred; retry with the artist Wikipedia action.") }
  }) } catch { /* The durable database queue remains pending if the response has closed. */ }
}
