// app/api/search/route.ts

import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q") || ""

  if (!q) {
    return NextResponse.json({ songs: [], artists: [] })
  }

  const songs = await prisma.song.findMany({
    where: {
      title: {
        contains: q,
        mode: "insensitive"
      }
    },
    include: { artist: true },
    take: 5
  })

  const artists = await prisma.artist.findMany({
    where: {
      name: {
        contains: q,
        mode: "insensitive"
      }
    },
    take: 5
  })

  return NextResponse.json({
    songs,
    artists
  })
}