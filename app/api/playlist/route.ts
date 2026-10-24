import { NextResponse } from "next/server"
import { submissionUser } from "@/lib/submissions/server"
import { SubmissionError } from "@/lib/submissions/validation"
import { playlistCategory, playlistId, playlistName, playlistUpdate } from "@/lib/playlists/validation"
import { ownedPlaylist, playlistBody, playlistFailure, playlistOrder, playlistTransaction, privateHeaders, refreshPlaylist } from "@/lib/playlists/server"

export async function POST(request: Request) {
  try {
    const user = await submissionUser(), body = await playlistBody(request)
    const name = playlistName(body?.name), category = playlistCategory(body?.category)
    const songId = body?.songId == null ? null : playlistId(body.songId)
    const playlist = await playlistTransaction(async tx => {
      if (songId && !await tx.song.findUnique({ where: { id: songId }, select: { id: true } })) throw new SubmissionError(404, "Pesma nije dostupna.")
      return tx.playlist.create({ data: { name, category, userId: user.id, isPublic: false, ...(songId ? { songs: { create: { songId, order: 0 } } } : {}) } })
    })
    refreshPlaylist(playlist.id)
    return NextResponse.json(playlist, { headers: privateHeaders })
  } catch (error) { return playlistFailure(error) }
}

export async function PUT(request: Request) {
  try {
    const user = await submissionUser(), body = await playlistBody(request)
    const id = playlistId(body?.playlistId), songId = playlistId(body?.songId)
    const item = await playlistTransaction(async tx => {
      await ownedPlaylist(tx, id, user.id)
      if (!await tx.song.findUnique({ where: { id: songId }, select: { id: true } })) throw new SubmissionError(404, "Pesma nije dostupna.")
      const already = await tx.playlistSong.findFirst({ where: { songId, playlist: { userId: user.id } }, select: { id: true } })
      const last = await tx.playlistSong.findFirst({ where: { playlistId: id, order: { not: null } }, orderBy: { order: "desc" }, select: { order: true } })
      const created = await tx.playlistSong.create({ data: { playlistId: id, songId, order: (last?.order ?? -1) + 1 } })
      if (!already) await tx.song.update({ where: { id: songId }, data: { popularity: { increment: 1 } } })
      return created
    })
    refreshPlaylist(id)
    return NextResponse.json(item, { headers: privateHeaders })
  } catch (error) { return playlistFailure(error) }
}

export async function DELETE(request: Request) {
  try {
    const user = await submissionUser(), body = await playlistBody(request)
    const id = playlistId(body?.playlistId), songId = body?.songId == null ? null : playlistId(body.songId)
    await playlistTransaction(async tx => {
      await ownedPlaylist(tx, id, user.id)
      if (songId) await tx.playlistSong.delete({ where: { playlistId_songId: { playlistId: id, songId } } })
      else { await tx.playlistSong.deleteMany({ where: { playlistId: id } }); await tx.playlist.delete({ where: { id } }) }
    })
    refreshPlaylist(id)
    return NextResponse.json({ ok: true }, { headers: privateHeaders })
  } catch (error) { return playlistFailure(error) }
}

export async function GET() {
  try {
    const user = await submissionUser()
    const playlists = await playlistTransaction(async tx => {
      // Retain the existing default Mix list without ever making it public automatically.
      if (!await tx.playlist.findFirst({ where: { userId: user.id, category: "mix" }, select: { id: true } })) await tx.playlist.create({ data: { name: "Mix", category: "mix", userId: user.id, isPublic: false } })
      return tx.playlist.findMany({ where: { userId: user.id }, include: { songs: { orderBy: playlistOrder } }, orderBy: [{ createdAt: "desc" }, { id: "asc" }] })
    })
    return NextResponse.json(playlists, { headers: privateHeaders })
  } catch (error) { return playlistFailure(error) }
}

export async function PATCH(request: Request) {
  try {
    const user = await submissionUser(), body = await playlistBody(request)
    const id = playlistId(body?.playlistId), data = playlistUpdate(body ?? {})
    const updated = await playlistTransaction(async tx => {
      await ownedPlaylist(tx, id, user.id)
      return tx.playlist.update({ where: { id }, data, select: { id: true, name: true, isPublic: true } })
    })
    refreshPlaylist(id)
    return NextResponse.json(updated, { headers: privateHeaders })
  } catch (error) { return playlistFailure(error) }
}
