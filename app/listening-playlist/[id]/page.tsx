import { prisma } from "@/lib/prisma"

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
        action={`/api/listening-playlist/item`}
        method="POST"
        className="flex gap-2 mb-8"
      >
        <input type="hidden" name="playlistId" value={playlist.id} />

        <input
          name="url"
          placeholder="YouTube ili Spotify link..."
          className="flex-1 p-2 rounded bg-black border border-gray-700"
        />

        <button className="bg-white text-black px-4 py-2 rounded">
          + Dodaj
        </button>
      </form>

      {/* ITEMS */}
      <div className="grid gap-6">

        {playlist.items.length === 0 && (
          <p className="text-gray-400">Nema pesama još</p>
        )}

        {playlist.items.map((item) => (
          <div key={item.id} className="border-b border-gray-800 pb-4">

            {/* YOUTUBE */}
            {item.type === "youtube" && (
              <iframe
                width="100%"
                height="200"
                src={`https://www.youtube.com/embed/${extractYoutubeId(item.url)}`}
                allowFullScreen
              />
            )}

            {/* SPOTIFY */}
            {item.type === "spotify" && (
              <iframe
                src={`https://open.spotify.com/embed/track/${extractSpotifyId(item.url)}`}
                width="100%"
                height="80"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              />
            )}

            <div className="mt-2 text-sm text-gray-300">
              {item.title || item.url}
            </div>

          </div>
        ))}

      </div>
    </div>
  )
}

// 🔥 helpers
function extractYoutubeId(url: string) {
  const match = url.match(/v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/)
  return match?.[1] || ""
}

function extractSpotifyId(url: string) {
  const match = url.match(/track\/([a-zA-Z0-9]+)/)
  return match?.[1] || ""
}