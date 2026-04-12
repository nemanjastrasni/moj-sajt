import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function PlaylistSongsPage({ params }: any) {

  const { slug } = params

  let songs: any[] = []

  const allSongs = await prisma.song.findMany({
    where: {},
    include: {
      artist: { select: { slug: true } }
    }
  })

  // 🔥 regex koji hvata i [G] i G
 const getChords = (text: string | null) => {
  if (!text) return []
  return text.match(/\[?[A-G](#|b)?(m|maj|min|sus|dim|aug)?\d*\]?/g) || []
}

  if (slug === "4-akorda") {
    songs = allSongs.filter((song) => {
      const chords = getChords(song.chords)
      const uniqueChords = [...new Set(chords.map(c => c.replace(/\[|\]/g, "")))]
      return uniqueChords.length <= 4 && uniqueChords.length > 0
    }).slice(0, 100)
  }

  if (slug === "beginner") {
    songs = allSongs.filter((song) => {
      const chords = getChords(song.chords)
      const uniqueChords = [...new Set(chords.map(c => c.replace(/\[|\]/g, "")))]
      const barre = ["F","Bm","F#m","B","Cm","Gm"]
      return uniqueChords.length > 0 && !uniqueChords.some(c => barre.includes(c))
    }).slice(0, 100)
  }

  if (slug === "acoustic") {
    const allowed = ["G","C","D","Em","Am"]
    songs = allSongs.filter((song) => {
      const chords = getChords(song.chords)
      const uniqueChords = [...new Set(chords.map(c => c.replace(/\[|\]/g, "")))]
      return uniqueChords.length > 0 && uniqueChords.every(c => allowed.includes(c))
    }).slice(0, 100)
  }

  // fallback ako ništa ne nađe (da vidiš da radi)
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