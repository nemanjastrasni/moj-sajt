import { prisma } from "@/lib/prisma"
import PlaylistPlayer from "@/app/components/PlaylistPlayer"

export default async function Page({ params }: any) {
  const playlist = await prisma.listeningPlaylist.findUnique({
    where: { id: params.id },
    include: {
      items: true,
    },
  })

  if (!playlist) {
    return <div className="p-10 text-white">Ne postoji</div>
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 text-white">

      <h1 className="text-3xl font-bold mb-6">
        🎧 {playlist.name}
      </h1>

      {/* ADD ITEM */}
      <form
        action="/api/listening-playlist/item"
        method="POST"
        className="flex gap-2 mb-8"
      >
        <input type="hidden" name="playlistId" value={playlist.id} />

        <input
          name="url"
          placeholder="YouTube ili Spotify link..."
          required
          className="flex-1 p-2 rounded bg-black border border-gray-700"
        />

        <button className="bg-white text-black px-4 py-2 rounded">
          + Dodaj
        </button>
      </form>

      {/* PLAYER + ITEMS */}
      <PlaylistPlayer playlist={playlist} />

    </div>
  )
}