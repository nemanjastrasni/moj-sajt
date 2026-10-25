import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { CategoryLabel } from "@/app/components/UiText"
import { playlistSongHref } from "@/lib/navigation/parent"

export default async function PlaylistSongsPage({ params }: { params: Promise<{ slug: string }> }) {

  const { slug } = await params

  const allSongs = await prisma.song.findMany({
    include: {
      artist: { select: { slug: true } }
    }
  })
  let songs: typeof allSongs = []

  // ✅ fallback: chords ili lyrics
  const getChords = (song: { chords: string | null; lyrics: string | null }) => {
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
        {slug.split("-").map((part: string, index: number) => <span key={index}><CategoryLabel value={part} /> </span>)}
      </h1>

      <div style={{ display: "grid", gap: "12px", fontSize:"18px" }}>

        {songs.map((song) => (
          <Link
            key={song.id}
            href={playlistSongHref(song, "/plejliste/kategorija/" + encodeURIComponent(slug))}
          >
            {song.title}
          </Link>
        ))}

      </div>

    </div>
  )
}
