import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { SubmissionError } from "@/lib/submissions/validation"
import { submissionUser } from "@/lib/submissions/server"
import { playlistId } from "@/lib/playlists/validation"
import { playlistBody, playlistFailure, playlistViewerId, privateHeaders, refreshPlaylist } from "@/lib/playlists/server"
import { playingUpdate } from "@/lib/playlists/settings"
import { readPlayingSetting, savePlayingSetting } from "@/lib/playlists/settingsServer"
type Context = { params: Promise<{ id: string; songId: string }> }
export async function GET(_request: Request, context: Context) {
  try { const params = await context.params; return NextResponse.json(await readPlayingSetting(playlistId(params.id), playlistId(params.songId), await playlistViewerId()), { headers: privateHeaders }) }
  catch (cause) { return playlistFailure(cause) }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const user = await submissionUser(), params = await context.params
    const id = playlistId(params.id), songId = playlistId(params.songId), input = playingUpdate(await playlistBody(request))
    const data = await savePlayingSetting(id, songId, user.id, input)
    refreshPlaylist(id)
    return NextResponse.json(data, { headers: privateHeaders })
  } catch (cause) {
    if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === "P2002") return playlistFailure(new SubmissionError(409, "Podesavanja su izmenjena na drugom mestu. Ucitaj sacuvanu verziju."))
    return playlistFailure(cause)
  }
}
