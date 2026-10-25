import { getServerSession } from "next-auth"
import { Prisma } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SubmissionError } from "../submissions/validation"
import { playlistTransaction, privateHeaders } from "../playlists/server"
import { NextResponse } from "next/server"

export { privateHeaders }
export const favoriteSelect = { id: true, transpose: true } as const
export async function favoriteViewer() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, banned: true } })
  return user && !user.banned ? user.id : null
}
export function favoriteFailure(error: unknown) {
  let status = 503, message = "Favoriti trenutno nisu dostupni. Pokusaj ponovo."
  if (error instanceof SubmissionError) { status = error.status; message = error.message }
  return NextResponse.json({ error: message }, { status, headers: privateHeaders })
}
export async function checkedFavoriteUser(tx: Prisma.TransactionClient, userId: string) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { banned: true } })
  if (!user || user.banned) throw new SubmissionError(403, "Nije dozvoljeno.")
}
export async function addFavorite(userId: string, songId: string, transpose: number, toggle = false) {
  return playlistTransaction(async tx => {
    await checkedFavoriteUser(tx, userId)
    const where = { userId_songId: { userId, songId } }
    const existing = await tx.favorite.findUnique({ where, select: favoriteSelect })
    if (existing) {
      if (!toggle) return { isFav: true, favorite: existing, added: false }
      await tx.favorite.delete({ where })
      return { isFav: false, favorite: null, removed: true }
    }
    if (!await tx.song.findUnique({ where: { id: songId }, select: { id: true } })) throw new SubmissionError(404, "Pesma nije dostupna.")
    const favorite = await tx.favorite.create({ data: { userId, songId, transpose }, select: favoriteSelect })
    await tx.song.update({ where: { id: songId }, data: { popularity: { increment: 1 } } })
    return { isFav: true, favorite, added: true }
  })
}
