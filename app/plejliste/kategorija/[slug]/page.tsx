import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function PlaylistSongsPage({ params }: any) {

  const { slug } = params

  let songs: any[] = []

  const allSongs = await prisma.song.findMany({
    include: {
      artist: { select: { slug: true } }
    }
  })

  // ✅ fallback: chords ili lyrics
  const getChords = (song: any) => {
    const text = song.chords || song.lyrics || ""
    const matches = text.match(/\[?[A-G][^\s\]]*/g) || []
    return matches.map((c: string) => c.replace(/\[|\]/g, ""))
  }

  if (slug === "4-akorda") {
    songs = allSongs.filter((song) => {
      const uniqueChords = [...new Set(getChords(song))]
      return uniqueChords.length > 0 && uniqueChords.length <= 4
    }).slice(0, 100)
  }

  if (slug === "beginner") {
    const barre = ["F","Bm","F#m","B","Cm","Gm"]

    songs = allSongs.filter((song) => {
      const uniqueChords = [...new Set(getChords(song))] as string[]
      return uniqueChords.length > 0 && !uniqueChords.some((c: string) => barre.includes(c))
    }).slice(0, 100)
  }

  if (slug === "acoustic") {
    const allowed = ["G","C","D","Em","Am"]

    songs = allSongs.filter((song) => {
      const uniqueChords = [...new Set(getChords(song))] as string[]
      return uniqueChords.length > 0 && uniqueChords.every((c: string) => allowed.includes(c))
    }).slice(0, 100)
  }

  // fallback (da uvek vidiš nešto)
  if (songs.length === 0) {
    songs = allSongs.slice(0, 20)
  }

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>

      <h1 style={{
        fontSize:"26px",
        marginBottom:"30px",
        color:"#38bdf8",
        textTransform:"capitalize"
      }}>
        {slug.replace("-", " ")}
      </h1>

      <div style={{ display: "grid", gap: "12px", fontSize:"18px" }}>

        {songs.map((song) => (
          <Link
            key={song.id}
            href={`/pesme/${song.category}/${song.artist.slug}/${song.slug}`}
          >
            {song.title}
          </Link>
        ))}

      </div>

    </div>
  )
}