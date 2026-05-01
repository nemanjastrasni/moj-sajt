import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import { prisma } from "../../../lib/prisma"

const normalizeCategory = (cat?: string) => {
  const c = (cat || "").toLowerCase()

  if (c.includes("dom")) return "domace"
  if (c.includes("str")) return "strane"
  if (c.includes("nar")) return "narodne"

  return "mix"
}

// CREATE PLAYLIST
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { name, category, songId } = await req.json()

  const user = await prisma.user.findUnique({
    where: { email: session.user?.email! },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const playlist = await prisma.playlist.create({
    data: {
    name,
    category: normalizeCategory(category),
    userId: user.id,
},
  })

  if (songId) {
  await prisma.playlistSong.create({
    data: {
      playlistId: playlist.id,
      songId,
      order: 0,
    },
  })
}

  return NextResponse.json(playlist)
}

// ADD SONG TO PLAYLIST
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  const { playlistId, songId } = await req.json()

  const user = await prisma.user.findUnique({
    where: {
      email: session.user?.email!,
    },
  })

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    )
  }

  try {
    const alreadyInAnyPlaylist = await prisma.playlistSong.findFirst({
      where: {
        songId,
        playlist: {
          userId: user.id,
        },
      },
    })

    // 👉 nađi poslednji order u toj playlisti
const last = await prisma.playlistSong.findFirst({
  where: { playlistId },
  orderBy: { order: "desc" },
})

const newOrder = (last?.order ?? -1) + 1

const item = await prisma.playlistSong.create({
  data: {
    playlistId,
    songId,
    order: newOrder,
  },
})

    if (!alreadyInAnyPlaylist) {
      await prisma.song.update({
        where: {
          id: songId,
        },
        data: {
          popularity: {
            increment: 1,
          },
        },
      })
    }

    return NextResponse.json(item)
  } catch (e) {
    return NextResponse.json(
      { error: "Already exists" },
      { status: 400 }
    )
  }
}

// DELETE (song ili cela playlista)
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { playlistId, songId } = await req.json()

    // 👉 briši pesmu iz playliste
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

    // 👉 briši celu playlistu
    await prisma.playlistSong.deleteMany({
      where: { playlistId },
    })

    await prisma.playlist.delete({
      where: { id: playlistId },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("DELETE ERROR:", e)
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}

// GET USER PLAYLISTS
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json([])

  const user = await prisma.user.findUnique({
    where: { email: session.user?.email! },
  })

  if (!user) return NextResponse.json([])

  // ✅ PROVERI DA LI POSTOJI MIX
  let mix = await prisma.playlist.findFirst({
    where: {
      userId: user.id,
      category: "mix",
    },
  })

  // ✅ AKO NE POSTOJI → NAPRAVI GA
  if (!mix) {
    mix = await prisma.playlist.create({
      data: {
        name: "Mix",
        category: "mix",
        userId: user.id,
      },
    })
  }

  // ✅ VRATI SVE PLAYLISTE
  const playlists = await prisma.playlist.findMany({
    where: { userId: user.id },
    include: {
    songs: {
    orderBy: {
      order: "asc",
    },
  },
},
  })

  return NextResponse.json(playlists)
}

// EDIT PLAYLIST (rename)
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