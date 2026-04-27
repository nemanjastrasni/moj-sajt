import { prisma } from "@/lib/prisma"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function TopDomaceListeningPage() {
  const playlists = await prisma.listeningPlaylist.findMany({
    where: {
      category: "Narodne",
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
    include: {
      items: true,
      user: true,
    },
  })

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 text-white">
      <h1 className="text-3xl font-bold text-center mb-8">
        🎧 Top 20 domaćih playlista
      </h1>

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
              {pl.items.length} pesama • {pl.views || 0} pregleda
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}