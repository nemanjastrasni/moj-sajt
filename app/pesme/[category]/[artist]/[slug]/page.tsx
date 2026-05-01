import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import SongClient from "../../../../components/SongClient"
import { resolveMusic } from "@/lib/music/resolver"
import type { Metadata } from "next"

type Props = {
  params: Promise<{
    category: string
    artist: string
    slug: string
  }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { artist, slug } = await params

  const title = slug.replace(/-/g, " ")
  const artistName = artist.replace(/-/g, " ")

  return {
    title: `${title} - ${artistName} akordi`,
    description: `Akordi i tekst pesme ${title} od ${artistName}.`,
    openGraph: {
      title: `${title} - ${artistName}`,
      description: `Akordi i tekst pesme ${title}`,
      images: ["https://gitarakordi.com/og.jpg"],
    },
  }
}

export default async function SongPage({ params }: Props) {
  const { artist, slug, category } = await params

  const song = await prisma.song.findFirst({
    where: {
      slug,
      artist: {
        slug: artist,
        category: category,
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
        id: song.id,
        title: song.title,
        artist: song.artist.name,
        lyrics: song.lyrics ?? undefined,
        chords: song.chords ?? undefined,
        category: song.artist.category ?? undefined,
        artistSlug: song.artist.slug,
        artistName: song.artist.name,
      }}
      media={media}
    />
  )
}