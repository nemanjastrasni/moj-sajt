import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function Page({ params }: any) {

  const { id } = params

  const isGenerated = ["4-akorda", "beginner", "acoustic"].includes(id)

  // ✅ GENERISANE
  if (isGenerated) {

    const allSongs = await prisma.song.findMany({
      where: {
        category: {
          in: ["domace", "strane", "narodne"]
        }
      },
      include: {
        artist: { select: { slug: true, name: true } }
      }
    })

    const getChords = (song: any) => {
      const text = song.lyrics || song.content || ""
      const matches = text.match(/\[?[A-G][^\s\]]*/g) || []
      return matches.map((c: string) => c.replace(/\[|\]/g, ""))
    }

    let filtered: any[] = []

    if (id === "4-akorda") {
      filtered = allSongs.filter((song) => {
        const unique = [...new Set(getChords(song))] as string[]
        return unique.length > 0 && unique.length <= 4
      })
    }

    if (id === "beginner") {
      const barre = ["F","Bm","F#m","B","Cm","Gm"]

      filtered = allSongs.filter((song) => {
        const unique = [...new Set(getChords(song))] as string[]
        return unique.length > 0 && !unique.some(c => barre.includes(c))
      })
    }

    if (id === "acoustic") {
      const allowed = ["G","C","D","Em","Am"]

      filtered = allSongs.filter((song) => {
        const unique = [...new Set(getChords(song))] as string[]
        return unique.length > 0 && unique.every(c => allowed.includes(c))
      })
    }

    const domace = filtered.filter(s => s.category === "domace").slice(0,50)
    const strane = filtered.filter(s => s.category === "strane").slice(0,50)
    const narodne = filtered.filter(s => s.category === "narodne").slice(0,50)

    return (
      <div style={{ padding: "40px" }}>
        <h1 style={{ fontSize: "28px", marginBottom: "30px" }}>
          {id.replace("-", " ")}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* DOMACE */}
          <div>
            <h2 className="text-blue-400 text-xl font-bold mb-3">🎵 Domaće</h2>
            {domace.map((song) => (
              <Link
                key={song.id}
                href={`/pesme/${song.category}/${song.artist.slug}/${song.slug}`}
                className="block py-1 border-b border-gray-800 hover:bg-[#1a1a1a] hover:text-green-400 transition px-2 rounded"
              >
                <span className="text-gray-400">
                  {song.artist?.name}
                </span>{" "}
                <span className="text-white">
                  - {song.title}
                </span>
              </Link>
            ))}
          </div>

          {/* STRANE */}
          <div>
            <h2 className="text-purple-400 text-xl font-bold mb-3">🌍 Strane</h2>
            {strane.map((song) => (
              <Link
                key={song.id}
                href={`/pesme/${song.category}/${song.artist.slug}/${song.slug}`}
                className="block py-1 border-b border-gray-800 hover:bg-[#1a1a1a] hover:text-green-400 transition px-2 rounded"
              >
                <span className="text-gray-400">
                  {song.artist?.name}
                </span>{" "}
                <span className="text-white">
                  - {song.title}
                </span>
              </Link>
            ))}
          </div>

          {/* NARODNE */}
          <div>
            <h2 className="text-yellow-400 text-xl font-bold mb-3">🎻 Narodne</h2>
            {narodne.map((song) => (
              <Link
                key={song.id}
                href={`/pesme/${song.category}/${song.artist.slug}/${song.slug}`}
                className="block py-1 border-b border-gray-800 hover:bg-[#1a1a1a] hover:text-green-400 transition px-2 rounded"
              >
                <span className="text-gray-400">
                  {song.artist?.name}
                </span>{" "}
                <span className="text-white">
                  - {song.title}
                </span>
              </Link>
            ))}
          </div>

        </div>
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