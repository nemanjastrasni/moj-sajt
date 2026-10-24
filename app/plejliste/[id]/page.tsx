import { prisma } from "@/lib/prisma"
import Link from "next/link"
import PlaylistClient from "@/app/components/PlaylistClient"
import { notFound } from "next/navigation"
import { playlistOrder, playlistViewerId, readablePlaylistWhere } from "@/lib/playlists/server"

export const dynamic = "force-dynamic"
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return ["4-akorda", "beginner", "acoustic"].includes(id) ? {} : { robots: { index: false, follow: false } }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {

  const { id } = await params

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

    const getChords = (song: { lyrics: string; content?: string }) => {
      const text = song.lyrics || song.content || ""
      const matches = text.match(/\[?[A-G][^\s\]]*/g) || []
      return matches.map((c: string) => c.replace(/\[|\]/g, ""))
    }

    let filtered: typeof allSongs = []

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
            <h2 className="text-blue-400 text-xl font-bold mb-3">🎵 Zabavne</h2>
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
  const viewerId = await playlistViewerId()
  const playlist = await prisma.playlist.findFirst({
    where: readablePlaylistWhere(id, viewerId),
    select: {
      id: true, name: true, userId: true, isPublic: true,
      songs: {
        orderBy: playlistOrder,
        select: {
          id: true, songId: true, playlistId: true, order: true,
          song: {
            select: {
              title: true, slug: true, category: true,
              artist: { select: { name: true, slug: true } },
            },
          },
        },
      },
    },
  })

  if (!playlist) notFound()

  return (
    <PlaylistClient
  key={JSON.stringify([playlist.id, playlist.name, playlist.isPublic, playlist.songs.map(item => [item.id, item.order, item.song.title, item.song.artist.name])])}
  playlistId={playlist.id}
  name={playlist.name}
  initialPublic={playlist.isPublic}
  canEdit={playlist.userId === viewerId}
  initialSongs={playlist.songs}
/>
)}
