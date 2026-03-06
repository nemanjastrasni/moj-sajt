import Link from "next/link"
import { getPlaylist } from "@/lib/music/playlists"

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {

  const { slug } = await params
  const songs = await getPlaylist(slug)

  return (
    <div className="max-w-4xl mx-auto p-6">

      <h1 className="text-3xl font-bold mb-6">
        Playlist: {slug}
      </h1>

      <div className="space-y-3">
        {songs.map((song) => (
          <Link
            key={song.id}
            href={`/pesme/${song.category}/${song.artist.slug}/${song.slug}`}
            className="block border p-3 rounded hover:bg-gray-100"
          >
            {song.artist.name} — {song.title}
          </Link>
        ))}
      </div>

    </div>
  )
}