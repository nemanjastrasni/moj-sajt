import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { submissionUser } from "@/lib/submissions/server"
import { SubmissionError } from "@/lib/submissions/validation"
import { playlistBody, playlistTransaction } from "@/lib/playlists/server"
import { playlistId } from "@/lib/playlists/validation"
import { favoriteTranspose } from "@/lib/favorites/model"
import { addFavorite, checkedFavoriteUser, favoriteFailure, favoriteSelect, privateHeaders } from "@/lib/favorites/server"

async function add(request: Request, toggle: boolean) {
  try {
    const user = await submissionUser(), body = await playlistBody(request)
    const songId = playlistId(body.songId), transpose = favoriteTranspose(body.transpose === undefined ? 0 : body.transpose)
    return NextResponse.json(await addFavorite(user.id, songId, transpose, toggle), { headers: privateHeaders })
  } catch (cause) { return favoriteFailure(cause) }
}
export const PUT = (request: Request) => add(request, false)
export const POST = (request: Request) => add(request, true)

export async function PATCH(request: Request) {
  try {
    const user = await submissionUser(), body = await playlistBody(request)
    const songId = playlistId(body.songId), id = playlistId(body.favoriteId)
    const transpose = favoriteTranspose(body.transpose), expected = favoriteTranspose(body.expectedTranspose)
    const updated = await playlistTransaction(async tx => {
      await checkedFavoriteUser(tx, user.id)
      return tx.favorite.updateMany({
      where: { id, userId: user.id, songId, transpose: expected, user: { banned: false } }, data: { transpose },
      })
    })
    if (updated.count !== 1) {
      const current = await prisma.favorite.findUnique({ where: { userId_songId: { userId: user.id, songId } }, select: favoriteSelect })
      throw new SubmissionError(current ? 409 : 404, current ? "Tonalitet je izmenjen. Ucitaj sacuvani tonalitet pre nove promene." : "Pesma vise nije u favoritima.")
    }
    return NextResponse.json({ isFav: true, favorite: { id, transpose } }, { headers: privateHeaders })
  } catch (cause) { return favoriteFailure(cause) }
}
export async function DELETE(request: Request) {
  try {
    const user = await submissionUser(), body = await playlistBody(request)
    const songId = playlistId(body.songId), favoriteId = body.favoriteId == null ? null : playlistId(body.favoriteId)
    await playlistTransaction(async tx => {
      await checkedFavoriteUser(tx, user.id)
      const current = await tx.favorite.findUnique({ where: { userId_songId: { userId: user.id, songId } }, select: favoriteSelect })
      if (!current) return
      if (favoriteId && current.id !== favoriteId) throw new SubmissionError(409, "Favorit je izmenjen. Osvezi stranicu.")
      await tx.favorite.delete({ where: { id: current.id } })
    })
    return NextResponse.json({ success: true, removed: true, isFav: false, favorite: null }, { headers: privateHeaders })
  } catch (cause) { return favoriteFailure(cause) }
}
