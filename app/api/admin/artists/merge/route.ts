import { NextResponse } from "next/server"
import { adminSongBody, adminSongFailure, requireSongAdmin } from "@/lib/adminSongs/server"
import { mergeArtists } from "@/lib/adminContent/merge"
import { refreshArtistContent } from "@/lib/adminContent/server"

export async function POST(request: Request) {
  try {
    const actor = await requireSongAdmin()
    const output = await mergeArtists(actor.id, await adminSongBody(request))
    if (output.result) refreshArtistContent(output.result.source, output.result.target)
    return NextResponse.json({ success: true, ...output }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) { return adminSongFailure(error) }
}
