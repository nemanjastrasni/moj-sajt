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

  // Pronađi izvođače koji sadrže search string
  const artists = await prisma.artist.findMany({
    where: {
      name: {
        contains: search,
       
      },
    },
    orderBy: { name: "asc" },
  })

  // Vrati samo polja koja su nam potrebna
  const result = artists.map((a) => ({
    id: a.id,
    name: a.name,
    bio: a.bio ?? "",
    discography: a.discography ?? "",
    slug: a.slug,
  }))

  return NextResponse.json(result)
}