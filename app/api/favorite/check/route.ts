import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { playlistId } from "@/lib/playlists/validation"
import { favoriteFailure, favoriteSelect, favoriteViewer, privateHeaders } from "@/lib/favorites/server"

export async function GET(request: Request) {
  try {
    const songId = playlistId(new URL(request.url).searchParams.get("songId"))
    const userId = await favoriteViewer()
    const favorite = userId ? await prisma.favorite.findUnique({ where: { userId_songId: { userId, songId } }, select: favoriteSelect }) : null
    return NextResponse.json({ isFav: Boolean(favorite), favorite }, { headers: privateHeaders })
  } catch (cause) { return favoriteFailure(cause) }
}
