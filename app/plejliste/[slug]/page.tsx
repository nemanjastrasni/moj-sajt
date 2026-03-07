import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function PlaylistPage({ params }: any) {

  const { slug } = params

  if (slug !== "easy-guitar" && slug !== "four-chords") {
  notFound()
}

  const allSongs = await prisma.song.findMany({
  include: {
    artist: true
  }
})

const songs = allSongs.filter((song) => {

  if (!song.lyrics) return false

  const chords = song.lyrics.match(/\[[A-G][^\]]*\]/g) || []
  const uniqueChords = [...new Set(chords)]

  if (slug === "easy-guitar") {
    return uniqueChords.length <= 5
  }

  if (slug === "four-chords") {
    return uniqueChords.length === 4
  }

  return false

}).slice(0, 30)

  return (
    <div className="max-w-4xl mx-auto p-6">

      <h1 className="text-3xl font-bold mb-6">
        Easy Guitar Songs
      </h1>

      <p className="text-gray-500 mb-8">
        Jednostavne pesme koje su pogodne za početnike na gitari.
      </p>

      <div className="space-y-3">

        {songs.map((song) => (

          <Link
            key={song.id}
            href={`/pesme/${song.category}/${song.artist.slug}/${song.slug}`}
            className="block border p-4 rounded hover:bg-gray-100"
          >

            <div className="font-medium">
              {song.title}
            </div>

            <div className="text-sm text-gray-500">
              {song.artist.name}
            </div>

          </Link>

        ))}

      </div>

    </div>
  )
}