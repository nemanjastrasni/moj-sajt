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

  if (name) {
    const artist = await prisma.artist.findFirst({
      where: { name },
    })

    if (!artist) return NextResponse.json(null)

    return NextResponse.json(artist)
  }

  if (search) {
    const artists = await prisma.artist.findMany({
  where: {
    name: {
      contains: search,
      mode: "insensitive"
    }
  },
  orderBy: { name: "asc" },
})

    return NextResponse.json(artists)
  }

  return NextResponse.json([])
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