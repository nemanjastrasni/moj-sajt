import { NextResponse } from "next/server"
import { getAdminPresence } from "@/lib/presence/server"
import { adminSongFailure } from "@/lib/adminSongs/server"
export const dynamic = "force-dynamic"
export async function GET() {
  try { return NextResponse.json(await getAdminPresence(), { headers: { "Cache-Control": "no-store, private" } }) }
  catch (error) {
    const response = adminSongFailure(error)
    response.headers.set("Cache-Control", "no-store, private")
    return response
  }
}
