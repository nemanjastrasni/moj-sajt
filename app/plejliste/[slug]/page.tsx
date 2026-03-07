import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function PlaylistPage({ params }: any) {

  const { slug } = params

 if (
  slug !== "easy-guitar" &&
  slug !== "four-chords" &&
  slug !== "beginner-songs" &&
  slug !== "narodne" &&
  slug !== "kafanske"
) {
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
    if (slug === "beginner-songs") {
  return uniqueChords.length <= 3
}
    if (slug === "narodne") {
  return song.category === "narodne"
}

if (slug === "kafanske") {
  return song.category === "kafanske"
}

    return false

  })
.sort(() => Math.random() - 0.5)
.slice(0, 30)

  const title =
  slug === "easy-guitar"
    ? "Easy Guitar Songs"
    : slug === "four-chords"
    ? "Four Chord Songs"
    : slug === "beginner-songs"
    ? "Beginner Guitar Songs"
    : slug === "narodne"
    ? "Narodne Pesme"
    : "Kafanske Pesme"

  const description =
  slug === "easy-guitar"
    ? "Jednostavne pesme koje su pogodne za početnike na gitari."
    : slug === "four-chords"
    ? "Pesme koje koriste samo četiri akorda."
    : slug === "beginner-songs"
    ? "Najlakše pesme za početnike na gitari."
    : slug === "narodne"
    ? "Najpoznatije narodne pesme za gitaru."
    : "Najpoznatije kafanske pesme za gitaru."

  return (
    <div className="max-w-4xl mx-auto p-6">

      <h1 className="text-3xl font-bold mb-6">
        {title}
      </h1>

      <p className="text-gray-500 mb-8">
        {description}
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