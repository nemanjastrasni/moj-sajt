import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { exactSongWhere, prepareSongQuery, rankSearchResults, SEARCH_LIMIT, songSearchWhere } from "@/lib/songSearch"

const select = {
  id: true, title: true, slug: true, category: true, popularity: true,
  artist: { select: { name: true, slug: true } },
} as const
const orderBy = [{ popularity: "desc" as const }, { title: "asc" as const }, { id: "asc" as const }]

export async function GET(req: Request) {
  let search
  try {
    search = prepareSongQuery(new URL(req.url).searchParams.get("q"))
  } catch {
    return NextResponse.json({ error: "Skrati pretragu na najvise 6 reci i 120 karaktera." }, { status: 400 })
  }
  if (!search) return NextResponse.json([])

  try {
    // Exact song titles cannot be displaced by more popular partial matches.
    const exact = await prisma.song.findMany({ where: exactSongWhere(search), select, orderBy, take: SEARCH_LIMIT })
    const partial = exact.length >= SEARCH_LIMIT ? [] : await prisma.song.findMany({
      where: { AND: [songSearchWhere(search), { id: { notIn: exact.map(song => song.id) } }] },
      select, orderBy, take: 40,
    })
    return NextResponse.json(rankSearchResults([...exact, ...partial], search.query), {
      headers: { "Cache-Control": "no-store" },
    })
  } catch {
    return NextResponse.json({ error: "Pretraga trenutno nije dostupna. Pokusaj ponovo." }, { status: 503 })
  }
}
