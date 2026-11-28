import { NextResponse } from "next/server"
import { musicBody, musicFailure, mutateMusic, privateHeaders } from "@/lib/music/server"
import { PATCH as editPlaylist } from "../route"

export const POST = editPlaylist

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const playlist = await mutateMusic((await params).id, await musicBody(request), "rename")
    return NextResponse.json({ playlist }, { headers: privateHeaders })
  } catch (error) { return musicFailure(error) }
}
