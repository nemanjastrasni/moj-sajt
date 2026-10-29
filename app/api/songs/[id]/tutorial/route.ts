import { NextResponse } from "next/server"
import { adminSongBody, requireSongAdmin } from "@/lib/adminSongs/server"
import { playlistId } from "@/lib/playlists/validation"
import { tutorialInput } from "@/lib/tutorials/model"
import { readTutorial, writeTutorial, tutorialHeaders, tutorialFailure } from "@/lib/tutorials/server"
type Context = { params: Promise<{ id: string }> }
export async function GET(_request: Request, context: Context) {
  try { return NextResponse.json(await readTutorial(playlistId((await context.params).id)), { headers: tutorialHeaders }) }
  catch (cause) { return tutorialFailure(cause) }
}
async function mutate(request: Request, context: Context, remove: boolean) {
  try {
    const actor = await requireSongAdmin(), id = playlistId((await context.params).id)
    const input = tutorialInput(await adminSongBody(request), remove)
    return NextResponse.json(await writeTutorial(id, actor.id, input, remove), { headers: tutorialHeaders })
  } catch (cause) { return tutorialFailure(cause) }
}
export const PUT = (request: Request, context: Context) => mutate(request, context, false)
export const DELETE = (request: Request, context: Context) => mutate(request, context, true)
