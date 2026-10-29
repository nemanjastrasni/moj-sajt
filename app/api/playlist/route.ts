import { NextResponse } from "next/server"
import { submissionUser } from "@/lib/submissions/server"
import { SubmissionError } from "@/lib/submissions/validation"
import { playlistCategory, playlistId, playlistName, playlistUpdate } from "@/lib/playlists/validation"
import { ownedPlaylist, playlistBody, playlistFailure, playlistOrder, playlistTransaction, privateHeaders, refreshPlaylist } from "@/lib/playlists/server"
import { playingValues } from "@/lib/playlists/settings"
import { activeSettingsOwner, checkSourceCapo } from "@/lib/playlists/settingsServer"

export async function POST(request: Request) {
  try {
    const user = await submissionUser(), body = await playlistBody(request)
    const name = playlistName(body?.name), category = playlistCategory(body?.category)
    const songId = body?.songId == null ? null : playlistId(body.songId)
    const settings = body.settings === undefined ? null : playingValues(body.settings)
    if (settings && !songId) throw new SubmissionError(400, "Proveri tonalitet i capo.")
    const playlist = await playlistTransaction(async tx => {
      if (settings) await activeSettingsOwner(tx, user.id)
      const song = songId ? await tx.song.findUnique({ where: { id: songId }, select: { id: true, lyrics: true } }) : null
      if (songId && !song) throw new SubmissionError(404, "Pesma nije dostupna.")
      if (settings && song) checkSourceCapo(song.lyrics, settings)
      return tx.playlist.create({ data: { name, category, userId: user.id, isPublic: false, ...(songId ? { songs: { create: { songId, order: 0, ...(settings ? { setting: { create: { userId: user.id, ...settings } } } : {}) } } } : {}) } })
    })
    refreshPlaylist(playlist.id)
    return NextResponse.json(playlist, { headers: privateHeaders })
  } catch (error) { return playlistFailure(error) }
}

export async function PUT(request: Request) {
  try {
    const user = await submissionUser(), body = await playlistBody(request)
    const id = playlistId(body?.playlistId), songId = playlistId(body?.songId)
    const settings = body.settings === undefined ? null : playingValues(body.settings)
    const item = await playlistTransaction(async tx => {
      if (settings) await activeSettingsOwner(tx, user.id)
      await ownedPlaylist(tx, id, user.id)
      const song = await tx.song.findUnique({ where: { id: songId }, select: { id: true, lyrics: true } })
      if (!song) throw new SubmissionError(404, "Pesma nije dostupna.")
      if (settings) checkSourceCapo(song.lyrics, settings)
      const already = await tx.playlistSong.findFirst({ where: { songId, playlist: { userId: user.id } }, select: { id: true } })
      const last = await tx.playlistSong.findFirst({ where: { playlistId: id, order: { not: null } }, orderBy: { order: "desc" }, select: { order: true } })
      const created = await tx.playlistSong.create({ data: { playlistId: id, songId, order: (last?.order ?? -1) + 1 } })
      if (settings) await tx.playlistSongSetting.create({ data: { playlistSongId: created.id, userId: user.id, ...settings } })
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
    const playlists = await playlistTransaction(tx => tx.playlist.findMany({ where: { userId: user.id }, include: { songs: { orderBy: playlistOrder } }, orderBy: [{ createdAt: "desc" }, { id: "asc" }] }))
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
