// app/api/admin/songs/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const songs = await prisma.song.findMany({
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(songs)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()

  if (!body.title || !body.artist) {
    return NextResponse.json(
      { error: "Title and artist are required" },
      { status: 400 }
    )
  }

  const song = await prisma.song.create({
    data: {
      title: body.title,
      artist: body.artist,
      category: body.category ?? "ostalo",
      lyrics: body.lyrics ?? "",
      chords: body.chords ?? "",
    },
  })

  return NextResponse.json(song, { status: 201 })
}