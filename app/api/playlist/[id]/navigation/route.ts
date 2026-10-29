import { NextResponse } from "next/server"
import { playlistFailure, playlistViewerId, privateHeaders } from "@/lib/playlists/server"
import { playlistId } from "@/lib/playlists/validation"
import { playlistNavigation } from "@/lib/playlists/navigationServer"
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = playlistId((await params).id), song = playlistId(new URL(request.url).searchParams.get("songId"))
    return NextResponse.json(await playlistNavigation(id, await playlistViewerId(), song), { headers: privateHeaders })
  } catch (cause) { return playlistFailure(cause) }
}
