import { NextResponse } from "next/server"
import { submissionUser } from "@/lib/submissions/server"
import { prisma } from "@/lib/prisma"
import { playlistId } from "@/lib/playlists/validation"
import { playlistFailure, privateHeaders } from "@/lib/playlists/server"

export async function GET(request: Request) {
  try {
    const user = await submissionUser(), songId = playlistId(new URL(request.url).searchParams.get("songId"))
    const membership = await prisma.playlistSong.findFirst({ where: { songId, playlist: { userId: user.id } }, select: { id: true } })
    return NextResponse.json({ songId, inPlaylist: Boolean(membership) }, { headers: privateHeaders })
  } catch (error) { return playlistFailure(error) }
}
