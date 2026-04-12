import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function ListeningPlaylistsPage() {
  const playlists = await prisma.listeningPlaylist.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
    },
  })

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 text-white">

      <h1 className="text-3xl font-bold text-center mb-10 tracking-wide">
        🎧 Moje playliste
      </h1>

      {/* CREATE PLAYLIST */}
      <form
        action="/api/listening-playlist"
        method="POST"
        className="flex gap-2 mb-8"
      >
        <input
          name="name"
          placeholder="Ime nove playliste..."
          required
          className="flex-1 p-2 rounded bg-black border border-gray-700"
        />
        <button className="bg-white text-black px-4 py-2 rounded">
          + Kreiraj
        </button>
      </form>

      {/* LISTA */}
      <div className="grid gap-4">

        {playlists.length === 0 && (
          <p className="text-gray-400 text-center">
            Nemaš još playliste
          </p>
        )}

        {playlists.map((pl) => (
          <div
            key={pl.id}
            className="p-4 rounded-lg border border-gray-800 hover:bg-white/5 transition flex justify-between items-center"
          >
            <Link href={`/listening-playlist/${pl.id}`}>
              <div>
                <div className="text-lg font-semibold">
                  🎧 {pl.name}
                </div>

                <div className="text-sm text-gray-400">
                  {pl.items.length} pesama
                </div>
              </div>
            </Link>

            <button
              onClick={async () => {
                if (!confirm("Obrisati playlistu?")) return

                await fetch(`/api/listening-playlist/${pl.id}`, {
                  method: "DELETE",
                })

                window.location.reload()
              }}
              className="text-red-500 hover:text-red-400"
            >
              🗑
            </button>
          </div>
        ))}

      </div>

    </div>
  )
}