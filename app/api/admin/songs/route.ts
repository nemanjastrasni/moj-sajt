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
  const { title, artistName, category, lyrics, chords, artistBio, artistDiscography } = body

  if (!title || !artistName) {
    return NextResponse.json(
      { error: "Title and artistName are required" },
      { status: 400 }
    )
  }

  const songSlug = slugify(title)
  const artistSlug = slugify(artistName)

  // Pronađi ili kreiraj/update artista
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
      },
    })
  } else {
    artist = await prisma.artist.update({
      where: { id: artist.id },
      data: {
        bio: artistBio ?? artist.bio,
        discography: artistDiscography ?? artist.discography,
      },
    })
  }

  // Kreiraj pesmu
  const song = await prisma.song.create({
    data: {
      title,
      slug: songSlug,
      category: category ?? "ostalo",
      lyrics: lyrics ?? "",
      chords: chords ?? "",
      artistId: artist.id,
    },
    include: { artist: true },
  })

  return NextResponse.json(song, { status: 201 })
}