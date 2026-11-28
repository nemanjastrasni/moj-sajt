import { NextResponse } from "next/server"
import { musicBody, musicFailure, privateHeaders, reorderMusicCatalog } from "@/lib/music/server"

export async function PUT(request: Request) {
  try {
    const items = await reorderMusicCatalog(await musicBody(request))
    return NextResponse.json({ items }, { headers: privateHeaders })
  } catch (error) { return musicFailure(error) }
}
