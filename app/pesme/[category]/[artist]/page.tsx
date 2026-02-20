import { notFound } from "next/navigation"
import { getAllSongs } from "@/lib/data/registry"
import Link from "next/link"

type Props = {
  params: Promise<{
    category: string
    artist: string
  }>
}

export default async function ArtistPage({ params }: Props) {
  const { category, artist } = await params

  if (!category || !artist) {
    notFound()
  }

  const songs = getAllSongs().filter(
    (s) => s.category === category && s.artist === artist
  )

  if (songs.length === 0) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 text-white">

      {/* Naziv izvođača */}
      <h1 className="text-3xl font-bold mb-3">
        {artist.toUpperCase()}
      </h1>

      {/* Biografija dugme */}
      <div className="mb-10">
        <Link
          href={`/pesme/${category}/${artist}/info`}
          className="inline-block border border-red-500 text-red-400 px-4 py-1 rounded hover:bg-red-500 hover:text-white transition"
        >
          Biografija →
        </Link>
      </div>

      {/* Lista pesama */}
      <ul className="space-y-4">
        {songs.map((song) => (
          <li key={song.id}>
            <Link
              href={`/pesme/${category}/${artist}/${song.id}`}
              className="text-blue-400 hover:text-blue-300 hover:underline text-lg"
            >
              {song.title}
            </Link>
          </li>
        ))}
      </ul>

    </div>
  )
}