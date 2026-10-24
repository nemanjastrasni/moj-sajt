import { NextResponse } from "next/server"
import { submissionUser } from "@/lib/submissions/server"
import { SubmissionError } from "@/lib/submissions/validation"
import { playlistId, playlistReorder } from "@/lib/playlists/validation"
import { ownedPlaylist, playlistBody, playlistFailure, playlistOrder, playlistTransaction, privateHeaders, refreshPlaylist } from "@/lib/playlists/server"

export async function POST(request: Request) {
  try {
    const user = await submissionUser(), body = await playlistBody(request)
    const id = playlistId(body?.playlistId), items = playlistReorder(body?.items)
    await playlistTransaction(async tx => {
      await ownedPlaylist(tx, id, user.id)
      const current = await tx.playlistSong.findMany({ where: { playlistId: id }, select: { id: true } })
      const ids = new Set(current.map(item => item.id))
      if (items.length !== ids.size || items.some(item => !ids.has(item.id))) throw new SubmissionError(409, "Playlista je izmenjena. Osvezi je pre promene redosleda.")
      for (const item of items) await tx.playlistSong.update({ where: { id: item.id }, data: { order: item.order } })
    })
    refreshPlaylist(id)
    return NextResponse.json({ ok: true }, { headers: privateHeaders })
  } catch (error) { return playlistFailure(error) }
}

export async function PATCH(request: Request) {
  try {
    const user = await submissionUser(), body = await playlistBody(request)
    const id = playlistId(body?.playlistId), songId = playlistId(body?.songId)
    if (body.direction !== "up" && body.direction !== "down") throw new SubmissionError(400, "Proveri redosled pesama.")
    const moved = await playlistTransaction(async tx => {
      await ownedPlaylist(tx, id, user.id)
      const current = await tx.playlistSong.findMany({ where: { playlistId: id }, orderBy: playlistOrder, select: { id: true, songId: true } })
      const from = current.findIndex(item => item.songId === songId), to = from + (body.direction === "up" ? -1 : 1)
      if (from < 0) throw new SubmissionError(404, "Pesma nije dostupna.")
      if (to < 0 || to >= current.length) return false
      ;[current[from], current[to]] = [current[to], current[from]]
      for (const [order, item] of current.entries()) await tx.playlistSong.update({ where: { id: item.id }, data: { order } })
      return true
    })
    refreshPlaylist(id)
    return NextResponse.json({ ok: moved }, { headers: privateHeaders })
  } catch (error) { return playlistFailure(error) }
}
