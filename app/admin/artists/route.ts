import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""

  if (!search) return NextResponse.json([])

  const artists = await prisma.artist.findMany({
    where: {
      name: { contains: search }, // SQLite je case-insensitive
    },
    take: 5,
  })

  return NextResponse.json(artists)
}