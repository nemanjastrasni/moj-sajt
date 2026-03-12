import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") || ""

  if (!q) return NextResponse.json([])

  const songs = await prisma.song.findMany({
    where: {
      title: {
        contains: q,
        mode: "insensitive"
      }
    },
    take: 10
  })

  return NextResponse.json(songs)
}