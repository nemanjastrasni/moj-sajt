import { notFound } from "next/navigation"
import { getAllSongs } from "@/lib/data/registry"
import SongClient from "../../../../components/SongClient"

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

  return <SongClient song={song} />
}