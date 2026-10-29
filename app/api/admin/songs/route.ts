import { NextResponse } from "next/server"
import { adminSongBody, adminSongFailure, createAdminSongs, listAdminSongs, refreshAdminSongs, requireSongAdmin } from "@/lib/adminSongs/server"
import { validateSongBatch } from "@/lib/adminSongs/validation"
import { adminSongFilters } from "@/lib/adminSongs/query"

export async function GET(request: Request) {
  try {
    await requireSongAdmin()
    const result = await listAdminSongs(adminSongFilters(Object.fromEntries(new URL(request.url).searchParams)))
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } })
  } catch (error) { return adminSongFailure(error) }
}
export async function POST(request: Request) {
  try {
    const actor = await requireSongAdmin()
    const input = validateSongBatch(await adminSongBody(request))
    const result = await createAdminSongs(input, actor.id)
    refreshAdminSongs()
    return NextResponse.json({ success: true, ...result }, { status: 201 })
  } catch (error) { return adminSongFailure(error) }
}
