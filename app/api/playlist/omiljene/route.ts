import { NextResponse } from "next/server"
import { submissionUser } from "@/lib/submissions/server"
import { createOmiljene } from "@/lib/playlists/omiljene"
import { playlistBody, playlistFailure, privateHeaders } from "@/lib/playlists/server"

export async function POST(request: Request) {
  try {
    const user = await submissionUser()
    await playlistBody(request)
    return NextResponse.json(await createOmiljene(user.id), { headers: privateHeaders })
  } catch (error) { return playlistFailure(error) }
}
