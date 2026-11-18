import { NextResponse } from "next/server"
import { playlistFailure } from "@/lib/playlists/server"
import { playlistId } from "@/lib/playlists/validation"
import { readOfflinePlaylist } from "@/lib/offline/server"
export const dynamic = "force-dynamic"
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return NextResponse.json(await readOfflinePlaylist(playlistId((await params).id)), { headers: { "Cache-Control": "private, no-store", Vary: "Cookie", "X-Robots-Tag": "noindex, nofollow" } })
  } catch (error) {
    const response = playlistFailure(error)
    response.headers.set("X-Robots-Tag", "noindex, nofollow")
    return response
  }
}
