import { NextResponse } from "next/server"
import { playlistFailure, playlistViewerId, privateHeaders } from "@/lib/playlists/server"
import { playlistId } from "@/lib/playlists/validation"
import { performanceSnapshot } from "@/lib/performance/server"
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = playlistId((await params).id), query = new URL(request.url).searchParams
    const songId = query.has("songId") ? playlistId(query.get("songId")) : undefined
    const snapshot = await performanceSnapshot(id, await playlistViewerId(), songId)
    return NextResponse.json(snapshot, { headers: privateHeaders })
  } catch (cause) { return playlistFailure(cause) }
}
