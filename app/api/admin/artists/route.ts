import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { adminSongBody, adminSongFailure, requireSongAdmin } from "@/lib/adminSongs/server"
import { escapeAdminLike } from "@/lib/adminSongs/query"
import { adminSongId } from "@/lib/adminSongs/validation"
import { validateArtistEdit } from "@/lib/adminContent/validation"
import { refreshArtistContent, updateArtistContent } from "@/lib/adminContent/server"

export async function GET(req: Request) {
  try {
    await requireSongAdmin()
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")?.trim().slice(0, 200)
    const name = searchParams.get("name")?.trim().slice(0, 200)
    if (name) {
      const artist = await prisma.artist.findFirst({ where: { name } })
      return NextResponse.json(artist, { headers: { "Cache-Control": "no-store" } })
    }
    const artists = search && search.length >= 2 ? await prisma.artist.findMany({
      where: { name: { contains: escapeAdminLike(search), mode: "insensitive" } },
      orderBy: { name: "asc" }, take: 12, select: { id: true, name: true, category: true },
    }) : []
    return NextResponse.json(artists, { headers: { "Cache-Control": "no-store" } })
  } catch (error) { return adminSongFailure(error) }
}

export async function POST(req: Request) {
  try {
    await requireSongAdmin()
    const body = await adminSongBody(req) as Record<string, unknown>
    const input = validateArtistEdit({ ...body, version: "0".repeat(64), image: body?.image ?? "", bio: body?.bio ?? "", discography: typeof body?.discography === "string" ? body.discography : JSON.stringify(body?.discography ?? []) })
    const artist = await prisma.artist.create({ data: { name: input.name, slug: adminSongId(body?.slug), category: input.category, bio: input.bio, image: input.image, discography: input.discography } })
    refreshArtistContent(artist)
    return NextResponse.json(artist)
  } catch (error) { return adminSongFailure(error) }
}
export async function PATCH(req: Request) {
  try {
    const actor = await requireSongAdmin(), body = await adminSongBody(req) as Record<string, unknown>
    const result = await updateArtistContent(adminSongId(body?.id), actor.id, validateArtistEdit(body))
    refreshArtistContent(result.before, result.artist)
    return NextResponse.json({ success: true })
  } catch (error) { return adminSongFailure(error) }
}
