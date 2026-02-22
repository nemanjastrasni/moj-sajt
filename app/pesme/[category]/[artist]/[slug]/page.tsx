import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import SongClient from "../../../../components/SongClient"
import { resolveMusic } from "@/lib/music/resolver"

type Props = {
  params: {
    category: string
    artist: string
    slug: string
  }
}

export default async function SongPage({ params }: Props) {
  const { category, artist, slug } = params

  const song = await prisma.song.findFirst({
    where: {
      slug,
      category,
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

  const media = await resolveMusic(song.artist.name, song.title)

  return (
  <SongClient
    song={{
      title: song.title,
      artist: song.artist.name,  
      lyrics: song.lyrics ?? undefined,
      chords: song.chords ?? undefined,
      category: song.category,
      artistSlug: song.artist.slug,
      artistName: song.artist.name,
    }}
    media={media}
  />
  )
}