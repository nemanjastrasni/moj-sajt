import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import { prisma } from "../../../lib/prisma"

// CREATE PLAYLIST
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { name, category, songId } = await req.json()

  // 🔥 uzmi user preko email
  const user = await prisma.user.findUnique({
    where: { email: session.user?.email! },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const playlist = await prisma.playlist.create({
    data: {
      name,
      category, // 🔥 novo
      userId: user.id,
    },
  })
   if (songId) {
  await prisma.playlistSong.create({
    data: {
      playlistId: playlist.id,
      songId,
    },
  })
}
  return NextResponse.json(playlist)
}


// ADD SONG TO PLAYLIST
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { playlistId, songId } = await req.json()

  try {
    const item = await prisma.playlistSong.create({
      data: {
        playlistId,
        songId,
      },
    })

    return NextResponse.json(item)
  } catch (e) {
    return NextResponse.json({ error: "Already exists" }, { status: 400 })
  }
}

// REMOVE SONG FROM PLAYLIST
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { playlistId, songId } = await req.json()

  // 👉 ako ima songId → briši pesmu
  if (songId) {
    await prisma.playlistSong.delete({
      where: {
        playlistId_songId: {
          playlistId,
          songId,
        },
      },
    })

    return NextResponse.json({ ok: true })
  }

  // 👉 ako nema songId → briši celu playlistu
  await prisma.playlist.delete({
    where: { id: playlistId },
  })

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json([])

  const user = await prisma.user.findUnique({
    where: { email: session.user?.email! },
  })

  if (!user) return NextResponse.json([])

  const playlists = await prisma.playlist.findMany({
    where: { userId: user.id },
  })

  return NextResponse.json(playlists)
}
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { playlistId, name } = await req.json()

  const updated = await prisma.playlist.update({
    where: { id: playlistId },
    data: { name },
  })

  return NextResponse.json(updated)
}
