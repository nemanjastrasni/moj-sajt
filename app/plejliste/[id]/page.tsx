import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function Page({ params }: any) {

  const { id } = params

  const isGenerated = ["4-akorda", "beginner", "acoustic"].includes(id)

  // ✅ GENERISANE
  if (isGenerated) {

    const allSongs = await prisma.song.findMany({
      include: {
        artist: { select: { slug: true, name: true } }
      }
    })

    const getChords = (song: any) => {
      const text = song.lyrics || song.content || ""
      const matches = text.match(/\[?[A-G][^\s\]]*/g) || []
      return matches.map((c: string) => c.replace(/\[|\]/g, ""))
    }

    let songs: any[] = []

    if (id === "4-akorda") {
      songs = allSongs.filter((song) => {
        const unique = [...new Set(getChords(song))] as string[]
        return unique.length > 0 && unique.length <= 4
      }).slice(0, 100)
    }

    if (id === "beginner") {
      const barre = ["F","Bm","F#m","B","Cm","Gm"]

      songs = allSongs.filter((song) => {
        const unique = [...new Set(getChords(song))] as string[]
        return unique.length > 0 && !unique.some(c => barre.includes(c))
      }).slice(0, 100)
    }

    if (id === "acoustic") {
      const allowed = ["G","C","D","Em","Am"]

      songs = allSongs.filter((song) => {
        const unique = [...new Set(getChords(song))] as string[]
        return unique.length > 0 && unique.every(c => allowed.includes(c))
      }).slice(0, 100)
    }

    if (songs.length === 0) {
      songs = allSongs.slice(0, 20)
    }

    return (
      <div style={{ padding: "40px" }}>
        <h1 style={{ fontSize: "28px", marginBottom: "20px" }}>
          {id.replace("-", " ")}
        </h1>

        {songs.map((song) => (
          <div key={song.id} style={{ padding: "10px 0", borderBottom: "1px solid #222" }}>
            <Link href={`/pesme/${song.category}/${song.artist.slug}/${song.slug}`}>
              <span className="text-gray-400">
                {song.artist?.name}
              </span>{" "}
              <span className="text-white">
                - {song.title}
              </span>
            </Link>
          </div>
        ))}
      </div>
    )
  }

  // ✅ NORMALNA PLAYLISTA
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: {
      songs: {
        include: {
          song: {
            include: {
              artist: true,
            },
          },
        },
      },
    },
  })

  if (!playlist) return <div>Ne postoji</div>

  return (
    <div style={{ padding: "40px" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "20px" }}>
        {playlist.name}
      </h1>

      {playlist.songs.map((s: any) => (
        <div key={s.id} style={{ padding: "10px 0", borderBottom: "1px solid #222" }}>
          <Link href={`/pesme/${s.song.category}/${s.song.artist.slug}/${s.song.slug}`}>
            <span className="text-gray-400">
              {s.song.artist?.name}
            </span>{" "}
            <span className="text-white">
              - {s.song.title}
            </span>
          </Link>
        </div>
      ))}
    </div>
  )
}