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
            startsWith: q,
            mode: "insensitive"
          }
        },
        {
          artist: {
            name: {
              startsWith: q,
              mode: "insensitive"
            }
          }
        }
      ]
    },
    include: {
      artist: true
    },
    take: 10
  })

  return NextResponse.json(songs)
}