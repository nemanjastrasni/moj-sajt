import Link from "next/link"
import { getPlaylist } from "@/lib/music/playlists"

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {

  const { slug } = await params
  const playlist = await getPlaylist(slug)

  if (!playlist) {
    return <div className="p-6">Playlist not found</div>
  }

  const songs = playlist.songs

  return (
    <div className="max-w-4xl mx-auto p-6">

      <h1 className="text-3xl font-bold mb-2">
        {playlist.title}
      </h1>

      <p className="text-gray-500 mb-6">
        {playlist.description}
      </p>

      <div className="space-y-3">
        {songs.map((song: any) => (
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