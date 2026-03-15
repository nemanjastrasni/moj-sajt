import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const songs = await prisma.song.findMany({
    orderBy: { createdAt: "desc" },
    include: { artist: true },
  })

  return NextResponse.json(songs)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { songs, artistName, category, artistBio, artistDiscography } = body

  if (!songs || songs.length === 0 || !artistName) {
    return NextResponse.json(
      { error: "Songs and artistName are required" },
      { status: 400 }
    )
  }

  const artistSlug = slugify(artistName)

  // pronađi ili kreiraj artista
  let artist = await prisma.artist.findFirst({
    where: { name: artistName },
  })

  if (!artist) {
    artist = await prisma.artist.create({
      data: {
        name: artistName,
        slug: artistSlug,
        bio: artistBio ?? "",
        discography: artistDiscography ?? "",
        category,
      },
    })
  } else {
    artist = await prisma.artist.update({
      where: { id: artist.id },
      data: {
        bio: artistBio ?? artist.bio,
        discography: artistDiscography ?? artist.discography,
        category,
      },
    })
  }

  const createdSongs = []

  for (const song of songs) {
    const songSlug = slugify(song.title)

    const newSong = await prisma.song.create({
      data: {
        title: song.title,
        slug: songSlug,
        category: category ?? "ostalo",
        lyrics: song.lyrics ?? "",
        chords: song.chords ?? "",
        artistId: artist.id,
      },
      include: { artist: true },
    })

    createdSongs.push(newSong)
  }

  return NextResponse.json(createdSongs, { status: 201 })
}