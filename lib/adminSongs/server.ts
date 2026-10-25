import { randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { slugify } from "@/lib/until/slug"
import { submissionUser } from "@/lib/submissions/server"
import { SubmissionError } from "@/lib/submissions/validation"
import { readLimitedJson, RequestBodyError } from "@/lib/auth/request"
import { NextResponse } from "next/server"
import { ADMIN_PAGE_SIZE, adminSongWhere, escapeAdminLike, type AdminSongFilters } from "./query"
import type { ArtistChoice, SongBatch, validateSongEdit } from "./validation"

export const requireSongAdmin = () => submissionUser(true)
export function adminSameOrigin(request: Request) {
  const origin = request.headers.get("origin")
  if (origin && origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") throw new SubmissionError(403, "Nije dozvoljeno.")
}
export async function adminSongBody(request: Request) {
  adminSameOrigin(request)
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new SubmissionError(415, "Ocekuju se JSON podaci.")
  try { return await readLimitedJson(request, 600000) }
  catch (error) { if (error instanceof RequestBodyError) throw new SubmissionError(error.status, error.status === 413 ? "Podaci su preveliki. Smanji broj pesama u jednom unosu." : "Neispravni podaci."); throw error }
}
export function adminSongFailure(error: unknown) {
  if (error instanceof SubmissionError) return NextResponse.json({ error: error.message }, { status: error.status })
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return NextResponse.json({ error: "Pesma ili izvodjac sa istom oznakom vec postoji. Osvezi spisak i proveri duplikate." }, { status: 409 })
    if (error.code === "P2025") return NextResponse.json({ error: "Pesma nije pronadjena. Osvezi spisak." }, { status: 404 })
  }
  return NextResponse.json({ error: "Baza trenutno nije dostupna. Pokusaj ponovo kasnije." }, { status: 503 })
}
async function transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 }) }
    catch (error) { if (attempt < 2 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") continue; throw error }
  }
}
async function chooseArtist(tx: Prisma.TransactionClient, input: ArtistChoice, allowCreate: boolean, metadata?: SongBatch) {
  const matches = input.artistId ? [] : await tx.artist.findMany({ where: { name: { equals: escapeAdminLike(input.artistName), mode: "insensitive" } }, take: 2 })
  if (matches.length > 1) throw new SubmissionError(409, "Vise izvodjaca ima taj naziv. Izaberi tacnog iz liste.")
  let artist = input.artistId ? await tx.artist.findUnique({ where: { id: input.artistId } }) : matches[0]
  if (!artist && (input.artistId || !allowCreate)) throw new SubmissionError(404, "Izvodjac nije pronadjen. Izaberi ga ponovo.")
  if (artist && artist.category !== input.category) throw new SubmissionError(409, "Kategorija pesme mora odgovarati kategoriji izvodjaca. Promenu izvodjaca uradi u njegovom panelu.")
  if (!artist) artist = await tx.artist.create({ data: { name: input.artistName, slug: slugify(input.artistName) || "izvodjac-" + randomUUID(), category: input.category, bio: metadata?.artistBio || null, ...(metadata?.artistDiscography.trim() ? { discography: metadata.artistDiscography.split(/\r?\n/).map(line => line.trim()).filter(Boolean) } : {}) } })
  return artist
}
async function duplicateTitle(tx: Prisma.TransactionClient, artistId: string, title: string, except?: string) {
  if (await tx.song.findFirst({ where: { artistId, title: { equals: escapeAdminLike(title), mode: "insensitive" }, ...(except ? { id: { not: except } } : {}) } })) throw new SubmissionError(409, `Pesma "${title}" vec postoji kod ovog izvodjaca.`)
}
export async function createAdminSongs(input: SongBatch) {
  return transaction(async tx => {
    const artist = await chooseArtist(tx, input, true, input)
    const songs = []
    for (const draft of input.songs) {
      await duplicateTitle(tx, artist.id, draft.title)
      const base = slugify(draft.title) || "pesma-" + randomUUID()
      let slug = base, suffix = 2
      while (await tx.song.findFirst({ where: { artistId: artist.id, slug } })) {
        if (suffix > 50) throw new SubmissionError(409, "Previse slicnih oznaka. Promeni naziv pesme.")
        slug = `${base}-${suffix++}`
      }
      songs.push(await tx.song.create({ data: { ...draft, slug, category: input.category, artistId: artist.id }, select: { id: true, title: true, slug: true } }))
    }
    return { songs, artist: { name: artist.name, slug: artist.slug }, category: input.category }
  })
}
export async function updateAdminSong(id: string, input: ReturnType<typeof validateSongEdit>) {
  return transaction(async tx => {
    const before = await tx.song.findUnique({ where: { id }, include: { artist: true } })
    if (!before) throw new SubmissionError(404, "Pesma nije pronadjena.")
    const artist = await chooseArtist(tx, input, false)
    await duplicateTitle(tx, artist.id, input.title, id)
    if (await tx.song.findFirst({ where: { artistId: artist.id, slug: before.slug, id: { not: id } } })) throw new SubmissionError(409, "Ova oznaka pesme vec postoji kod izabranog izvodjaca.")
    // An untouched empty form field must not turn NULL into a content change.
    const chords = before.chords === null && input.chords === "" ? null : input.chords
    const song = await tx.song.update({ where: { id }, data: { title: input.title, lyrics: input.lyrics, chords, artistId: artist.id, category: input.category } })
    return { song, artist, before }
  })
}
export async function deleteAdminSong(id: string, title: string) {
  return transaction(async tx => {
    const song = await tx.song.findUnique({ where: { id }, include: { artist: true } })
    if (!song) throw new SubmissionError(404, "Pesma nije pronadjena. Osvezi spisak.")
    if (song.title !== title) throw new SubmissionError(409, "Pesma je u medjuvremenu izmenjena. Osvezi spisak pre brisanja.")
    await tx.favorite.deleteMany({ where: { songId: id } })
    await tx.playlistSong.deleteMany({ where: { songId: id } })
    await tx.songSubmission.updateMany({ where: { publishedSongId: id }, data: { publishedSongId: null } })
    await tx.song.delete({ where: { id } })
    return song
  })
}
export async function listAdminSongs(filters: AdminSongFilters) {
  const where = adminSongWhere(filters)
  const total = await prisma.song.count({ where })
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE))
  const page = Math.min(filters.page, totalPages)
  const orderBy: Prisma.SongOrderByWithRelationInput[] = filters.sort === "title" ? [{ title: "asc" }, { id: "asc" }] : filters.sort === "artist" ? [{ artist: { name: "asc" } }, { title: "asc" }, { id: "asc" }] : [{ createdAt: "desc" }, { id: "desc" }]
  const songs = await prisma.song.findMany({ where, select: { id: true, title: true, slug: true, category: true, review: { select: { status: true } }, artist: { select: { id: true, name: true, slug: true } } }, orderBy, skip: (page - 1) * ADMIN_PAGE_SIZE, take: ADMIN_PAGE_SIZE })
  return { songs, total, totalPages, page }
}
export function refreshAdminSongs() {
  // Database work has committed; cache errors must not report a failed write.
  try { for (const path of ["/pesme", "/biografija", "/admin/songs", "/favorite", "/profile", "/plejliste", "/moji-predlozi"]) revalidatePath(path, "layout"); revalidatePath("/") } catch {}
}
