import { NextResponse } from "next/server"
import { requireSongAdmin, adminSongBody, adminSongFailure } from "@/lib/adminSongs/server"
import { adminSongId } from "@/lib/adminSongs/validation"
import { queueArtistWikipedia } from "@/lib/artists/wikipedia"
import { prisma } from "@/lib/prisma"

export const maxDuration = 60
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSongAdmin(); await adminSongBody(request)
    const id = adminSongId((await params).id)
    const artist = await prisma.artist.findUnique({ where: { id }, select: { id: true } })
    if (!artist) return NextResponse.json({ error: "Izvodjac nije pronadjen." }, { status: 404 })
    // Do not interrupt an in-flight lookup or clear stored attribution.
    await prisma.$executeRawUnsafe(`UPDATE public."ArtistWikiProfile" SET state='pending' WHERE "artistId"=$1 AND (state<>'working' OR "checkedAt" < CURRENT_TIMESTAMP-INTERVAL '5 minutes')`, id)
    queueArtistWikipedia(id)
    return NextResponse.json({ queued: true }, { status: 202 })
  } catch (error) { return adminSongFailure(error) }
}
