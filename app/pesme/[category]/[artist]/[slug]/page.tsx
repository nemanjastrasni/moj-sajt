import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import SongClient from "../../../../components/SongClient"
import { resolveMusic } from "@/lib/music/resolver"
import type { Metadata } from "next"

type Props = {
  params: {
    category: string
    artist: string
    slug: string
  }
}

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const { artist, slug } = await params

  const song = await prisma.song.findFirst({
    where: {
      slug,
      artist: { slug: artist },
    },
    include: { artist: true },
  })

  if (!song) {
    return {
      title: "Pesma nije pronađena",
    }
  }

  return {
    title: `${song.title} – ${song.artist.name}`,
    description: `Akordi i tekst pesme ${song.title} od izvođača ${song.artist.name}.`,
    openGraph: {
      title: `${song.title} – ${song.artist.name}`,
      description: `Akordi i tekst pesme ${song.title}.`,
      type: "article",
    },
  }
}

export default async function SongPage({ params }: Props) {
  const { artist, slug } = await params

  const song = await prisma.song.findFirst({
    where: {
      slug,
      artist: { slug: artist },
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
        category: song.artist.category ?? undefined,
        artistSlug: song.artist.slug,
        artistName: song.artist.name,
      }}
      media={media}
    />
  )
}