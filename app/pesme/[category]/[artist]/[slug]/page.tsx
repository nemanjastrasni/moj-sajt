import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import SongClient from "../../../../components/SongClient"
import { resolveMusic } from "@/lib/music/resolver"

type Props = {
  params: Promise<{
    category: string
    artist: string
    slug: string
  }>
}

export default async function SongPage({ params }: Props) {
  const { artist, slug } = await params

  const song = await prisma.song.findFirst({
    where: {
      slug,
      artist: {
        slug: artist,
      },
    },
    include: {
      artist: true,
    },
  })

  if (!song) {
    notFound()
  }

  let media = null

try {
  media = await resolveMusic(song.artist.name, song.title)
} catch (e) {
  console.error("Music resolver failed:", e)
}

  return (
    <SongClient
      song={{
        title: song.title,
        artist: song.artist.name,
        lyrics: song.lyrics ?? undefined,
        chords: song.chords ?? undefined,
        category: song.artist.category ?? undefined, // uzimamo iz artist-a
        artistSlug: song.artist.slug,
        artistName: song.artist.name,
      }}
      media={media}
    />
  )
}