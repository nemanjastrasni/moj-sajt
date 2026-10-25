import { NextResponse } from "next/server"
import { adminSongBody, adminSongFailure, refreshAdminSongs, requireSongAdmin } from "@/lib/adminSongs/server"
import { adminSongId } from "@/lib/adminSongs/validation"
import { setSongReview, validateSongReview } from "@/lib/songReview/server"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSongAdmin(), id = adminSongId((await params).id)
    const review = await setSongReview(id, actor.id, validateSongReview(await adminSongBody(request)))
    refreshAdminSongs()
    return NextResponse.json({ success: true, review }, { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } })
  } catch (error) { return adminSongFailure(error) }
}
