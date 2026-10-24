import { Prisma } from "@prisma/client"
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SubmissionError } from "@/lib/submissions/validation"
import { submissionBody } from "@/lib/submissions/server"

export const playlistOrder: Prisma.PlaylistSongOrderByWithRelationInput[] = [{ order: { sort: "asc", nulls: "last" } }, { id: "asc" }]
export const privateHeaders = { "Cache-Control": "private, no-store", Vary: "Cookie" }
export async function playlistBody(request: Request): Promise<Record<string, unknown>> {
  const value = await submissionBody(request)
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SubmissionError(400, "Neispravni podaci.")
  return value as Record<string, unknown>
}
export function readablePlaylistWhere(id: string, viewerId: string | null): Prisma.PlaylistWhereInput {
  return { id, OR: [{ isPublic: true }, ...(viewerId ? [{ userId: viewerId }] : [])] }
}
export async function playlistViewerId() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, banned: true } })
  return user && !user.banned ? user.id : null
}
export async function ownedPlaylist(tx: Prisma.TransactionClient, id: string, userId: string) {
  const playlist = await tx.playlist.findFirst({ where: { id, userId }, select: { id: true, name: true, isPublic: true } })
  if (!playlist) throw new SubmissionError(404, "Playlista nije dostupna.")
  return playlist
}
export async function playlistTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 }) }
    catch (error) { if (attempt < 2 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") continue; throw error }
  }
}
export function playlistFailure(error: unknown) {
  let status = 503, message = "Baza trenutno nije dostupna. Pokusaj ponovo kasnije."
  if (error instanceof SubmissionError) { status = error.status; message = error.message }
  else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") { status = 409; message = "Pesma je vec u ovoj playlisti." }
    if (error.code === "P2025") { status = 404; message = "Playlista ili pesma nije dostupna." }
  }
  return NextResponse.json({ error: message }, { status, headers: privateHeaders })
}
export function refreshPlaylist(id: string) {
  try { revalidatePath(`/plejliste/${id}`); revalidatePath("/profile/plejliste") } catch {}
}
