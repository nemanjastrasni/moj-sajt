import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { stableStringify } from "@/lib/wiki-values.cjs"
import { requireSongAdmin, refreshAdminSongs } from "@/lib/adminSongs/server"
import { SubmissionError } from "@/lib/submissions/validation"
import type { validateArtistEdit, validateBioDelete, validateUserRole } from "./validation"
import { artistPageHref } from "./paths"

type ArtistState = { name: string; category: string | null; image: string | null; bio: string | null; bioShort: string | null; discography: unknown }
export function artistContentVersion(artist: ArtistState) {
  return createHash("sha256").update(stableStringify({ name: artist.name, category: artist.category, image: artist.image, bio: artist.bio, bioShort: artist.bioShort, discography: artist.discography })).digest("hex")
}
export async function contentAdmin() {
  try { return await requireSongAdmin() }
  catch (error) { if (error instanceof SubmissionError && [401, 403].includes(error.status)) return null; throw error }
}
async function transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 }) }
    catch (error) { if (attempt < 2 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") continue; throw error }
  }
}
async function activeAdmin(tx: Prisma.TransactionClient, actorId: string) {
  const actor = await tx.user.findUnique({ where: { id: actorId }, select: { id: true, role: true, banned: true } })
  if (!actor || actor.banned || actor.role !== "admin") throw new SubmissionError(403, "Nije dozvoljeno.")
}
export async function updateArtistContent(id: string, actorId: string, input: ReturnType<typeof validateArtistEdit>) {
  return transaction(async tx => {
    await activeAdmin(tx, actorId)
    const before = await tx.artist.findUnique({ where: { id } })
    if (!before) throw new SubmissionError(404, "Izvodjac nije pronadjen.")
    if (artistContentVersion(before) !== input.version) throw new SubmissionError(409, "Izvodjac je u medjuvremenu izmenjen. Osvezi stranicu.")
    const data = { name: input.name, category: input.category, image: input.image, bio: input.bio, discography: input.discography }
    // Keep the slug stable, and move song categories together with their artist.
    const artist = await tx.artist.update({ where: { id }, data: { ...data, ...(input.bio !== (before.bio ?? "") ? { bioShort: null } : {}) } })
    if (before.category !== artist.category) await tx.song.updateMany({ where: { artistId: id }, data: { category: artist.category! } })
    return { before, artist }
  })
}
export async function deleteArtistBiography(id: string, actorId: string, input: ReturnType<typeof validateBioDelete>) {
  return transaction(async tx => {
    await activeAdmin(tx, actorId)
    const artist = await tx.artist.findUnique({ where: { id } })
    if (!artist) throw new SubmissionError(404, "Izvodjac nije pronadjen.")
    if (artist.name !== input.name || artistContentVersion(artist) !== input.version) throw new SubmissionError(409, "Izvodjac je u medjuvremenu izmenjen. Osvezi stranicu.")
    await tx.artist.update({ where: { id }, data: { bio: null, bioShort: null } })
    return artist
  })
}
export async function updateUserRole(id: string, actorId: string, input: ReturnType<typeof validateUserRole>) {
  return transaction(async tx => {
    await activeAdmin(tx, actorId)
    if (id === actorId) throw new SubmissionError(400, "Sopstvenu admin ulogu ne mozes menjati ovim dugmetom.")
    const target = await tx.user.findUnique({ where: { id }, select: { id: true, role: true, banned: true } })
    if (!target) throw new SubmissionError(404, "Korisnik nije pronadjen.")
    if (target.banned) throw new SubmissionError(409, "Blokiranom korisniku nije moguce menjati ulogu.")
    if (target.role !== input.expectedRole) throw new SubmissionError(409, "Uloga je u medjuvremenu izmenjena. Osvezi spisak.")
    return tx.user.update({ where: { id }, data: { role: input.role }, select: { id: true, role: true } })
  })
}
export function refreshArtistContent(...artists: { category: string | null; slug: string }[]) {
  refreshAdminSongs()
  try {
    revalidatePath("/admin/artists", "layout")
    for (const artist of artists) {
      revalidatePath(artistPageHref(artist), "layout")
      revalidatePath(artistPageHref(artist, "bio"))
    }
  } catch {}
}
