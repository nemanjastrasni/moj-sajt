import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export const revalidate = 3600
export async function GET() {
  try {
    const songs = await prisma.song.findMany({
      take: 5,
      orderBy: { id: "desc" }, // privremeno
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
    })

    return NextResponse.json(songs)
  } catch (error) {
    console.error("LATEST ERROR:", error)
    return NextResponse.json({ error: "fail" }, { status: 500 })
  }
}