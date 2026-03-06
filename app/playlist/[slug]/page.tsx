import Link from "next/link"
import { getPlaylist } from "@/lib/music/playlists"

type Props = {
  params: {
    slug: string
  }
}

export default async function PlaylistPage({ params }: Props) {

  const songs = await getPlaylist(params.slug)

  return (
    <div className="max-w-4xl mx-auto p-6">

      <h1 className="text-3xl font-bold mb-6">
        Playlist: {params.slug}
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