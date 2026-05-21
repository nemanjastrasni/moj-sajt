import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")

  if (!q || q.length < 2) {
    return NextResponse.json([])
  }

  const songs = await prisma.song.findMany({
    where: {
      OR: [
        {
          title: {
            startsWith: q
          }
        },
        {
          artist: {
            name: {
              startsWith: q
            }
          }
        }
      ]
    },
    
    select: {
  id: true,
  title: true,
  slug: true,
  category: true,
  artist: {
    select: {
      name: true,
      slug: true
    }
  }
},
    take: 10
  })

  return NextResponse.json(songs)
}