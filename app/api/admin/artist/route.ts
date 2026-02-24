import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { search } = Object.fromEntries(new URL(req.url).searchParams)

  if (!search || typeof search !== "string") {
    return NextResponse.json([], { status: 200 })
  }

  const artists = await prisma.artist.findMany({
    orderBy: { name: "asc" },
  })

  return NextResponse.json(
    artists.map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      bio: a.bio,
      discography: a.discography,
      image: a.image,
    }))
  )
}