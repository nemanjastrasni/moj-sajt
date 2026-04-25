import { prisma } from "@/lib/prisma"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function PublicListeningPlaylistsPage() {
  const playlists = await prisma.listeningPlaylist.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      items: true,
      user: true,
    },
  })

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 text-white">
      <h1 className="text-3xl font-bold text-center mb-8">
        🌍 Sve playliste za slušanje
      </h1>

      <p className="text-sm text-gray-400 text-center mb-8">
        Javne playliste svih korisnika
      </p>

      <div className="grid gap-4">
        {playlists.map((pl) => (
          <Link
            key={pl.id}
            href={`/listening-playlist/${pl.id}`}
            className="p-4 rounded-lg border border-gray-800 hover:bg-white/5 transition"
          >
            <div className="text-lg font-semibold">
              🎧 {pl.name}
            </div>

            <div className="text-sm text-gray-400">
  {pl.user?.image ? (
    <img
      src={pl.user.image}
      alt=""
      className="w-5 h-5 rounded-full inline-block mr-2"
    />
  ) : (
    <span className="mr-2">👤</span>
  )}

  {pl.user?.name
    ? pl.user.name
    : pl.user?.email?.split("@")[0] || "Korisnik"} • {pl.items.length} pesama
</div>
          </Link>
        ))}
      </div>
    </div>
  )
}