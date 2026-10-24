import { NextResponse } from "next/server"
import { submissionUser } from "@/lib/submissions/server"
import { SubmissionError } from "@/lib/submissions/validation"
import { playlistId } from "@/lib/playlists/validation"
import { ownedPlaylist, playlistBody, playlistFailure, playlistTransaction, privateHeaders, refreshPlaylist } from "@/lib/playlists/server"

export async function POST(request: Request) {
  try {
    const user = await submissionUser(), body = await playlistBody(request)
    const id = playlistId(body?.playlistSongId)
    const parent = await playlistTransaction(async tx => {
      const item = await tx.playlistSong.findUnique({ where: { id }, select: { playlistId: true } })
      if (!item) throw new SubmissionError(404, "Pesma nije dostupna.")
      await ownedPlaylist(tx, item.playlistId, user.id)
      await tx.playlistSong.delete({ where: { id } })
      return item.playlistId
    })
    refreshPlaylist(parent)
    return NextResponse.json({ success: true }, { headers: privateHeaders })
  } catch (error) { return playlistFailure(error) }
}
