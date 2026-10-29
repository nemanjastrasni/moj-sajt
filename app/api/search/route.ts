import { NextResponse } from "next/server"
import { prepareSongQuery, rankSearchResults } from "@/lib/songSearch"
import { normalizedSongSearch } from "@/lib/songSearchServer"

export async function GET(req: Request) {
  let search
  try {
    search = prepareSongQuery(new URL(req.url).searchParams.get("q"))
  } catch {
    return NextResponse.json({ error: "Skrati pretragu na najvise 6 reci i 120 karaktera." }, { status: 400 })
  }
  if (!search) return NextResponse.json([])

  try {
    return NextResponse.json(rankSearchResults(await normalizedSongSearch(search), search.query), {
      headers: { "Cache-Control": "no-store" },
    })
  } catch {
    return NextResponse.json({ error: "Pretraga trenutno nije dostupna. Pokusaj ponovo." }, { status: 503 })
  }
}
