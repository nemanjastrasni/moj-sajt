import { prisma } from "@/lib/prisma"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function PublicListeningPlaylistsPage({
  searchParams,
}: any) {
  const selectedCategory = searchParams.category || null
  const playlists = await prisma.listeningPlaylist.findMany({
  where: {
    isPublic: true,
    ...(selectedCategory
      ? {
          category: selectedCategory,
        }
      : {}),
  },
  orderBy: {
    views: "desc",
  },
  include: {
    user: true,
    items: {
      orderBy: {
        order: "asc",
      },
    },
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
      <div className="flex flex-wrap gap-3 justify-center mb-8">
  <Link href="/public-listening-playlists" className="px-4 py-2 rounded bg-white/10">
    Sve
  </Link>

  <Link href="/public-listening-playlists?category=Domace" className="px-4 py-2 rounded bg-white/10">
    Domaće
  </Link>

  <Link href="/public-listening-playlists?category=Strane" className="px-4 py-2 rounded bg-white/10">
    Strane
  </Link>

  <Link href="/public-listening-playlists?category=Narodne" className="px-4 py-2 rounded bg-white/10">
    Narodne
  </Link>

  <Link href="/public-listening-playlists?category=Mix" className="px-4 py-2 rounded bg-white/10">
    Mix
  </Link>
</div>

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

      {pl.items[0]?.url && (
        <img
          src={`https://img.youtube.com/vi/${pl.items[0].url.match(/v=([^&]+)/)?.[1] || ""}/0.jpg`}
          alt=""
          className="w-full max-w-[220px] h-[120px] object-cover rounded-lg mt-3 mb-3"
        />
      )}

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

        {pl.user?.name || "Korisnik"} • {pl.items.length} pesama • {pl.views || 0} pregleda
      </div>
    </Link>
  ))}
</div>
    </div>
  )
}