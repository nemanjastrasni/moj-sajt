import { notFound } from "next/navigation"
import { getAllSongs } from "@/lib/data/registry"
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
  const { category, artist, slug } = await params
  const songs = getAllSongs()

  const song = songs.find(
    (s) =>
      s.category === category &&
      s.artist === artist &&
      s.id === slug
  )

  if (!song) {
    notFound()
  }

  const media = await resolveMusic(song.artistFull, song.title)

  console.log("RESOLVED MEDIA:", media)

  return <SongClient song={song} media={media} />
}