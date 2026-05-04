import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const songs = await prisma.song.findMany({
      take: 12,
      orderBy: { id: "desc" }, // privremeno
      include: { artist: true },
    })

    return NextResponse.json(songs)
  } catch (error) {
    console.error("LATEST ERROR:", error)
    return NextResponse.json({ error: "fail" }, { status: 500 })
  }
}