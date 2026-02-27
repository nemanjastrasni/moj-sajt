import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")
  const name = searchParams.get("name")

  // ✅ Tačno ime (za automatsku kategoriju)
  if (name) {
    const artist = await prisma.artist.findFirst({
      where: { name },
    })

    if (!artist) return NextResponse.json(null)

    return NextResponse.json({
      id: artist.id,
      name: artist.name,
      slug: artist.slug,
      bio: artist.bio ?? "",
      discography: artist.discography ?? "",
      image: artist.image,
      category: artist.category,
    })
  }

  // ✅ Autocomplete
  if (search) {
    const artists = await prisma.artist.findMany({
      where: {
        name: {
          contains: search,
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(
      artists.map((a) => ({
        id: a.id,
        name: a.name,
        bio: a.bio ?? "",
        discography: a.discography ?? "",
        slug: a.slug,
        image: a.image,
        category: a.category,
      }))
    )
  }

  return NextResponse.json([])
}