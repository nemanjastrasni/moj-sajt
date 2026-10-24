import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { adminSongFailure, requireSongAdmin } from "@/lib/adminSongs/server"
import { escapeAdminLike } from "@/lib/adminSongs/query"

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
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()

  const { name, slug, bio, discography, image, category } = body

  if (!name || !slug || !category) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    )
  }

  const artist = await prisma.artist.create({
    data: {
      name,
      slug,
      bio,
      discography,
      image,
      category, // 🔥 OVO JE BILO KLJUČNO
    },
  })

  return NextResponse.json(artist)
}
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { id, name, bio, discography, image, category } = body

  const updated = await prisma.artist.update({
    where: { id },
    data: { name, bio, discography, image, category },
  })

  return NextResponse.json(updated)
}
