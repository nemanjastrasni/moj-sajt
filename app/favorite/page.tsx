import UiText from "@/app/components/UiText"
import { prisma } from "@/lib/prisma"
import { favoriteViewer } from "@/lib/favorites/server"
import { favoriteSongHref } from "@/lib/favorites/model"
import FavoriteSongbook from "@/app/components/FavoriteSongbook"

export default async function FavoritePage() {
  const userId = await favoriteViewer()

  if (!userId) {
    return (
      <div style={{ padding: "40px" }}>
        <UiText text="Morate biti ulogovani." />
      </div>
    )
  }


  const favorites = await prisma.favorite.findMany({
    where: {
      userId,
    },
    select: {
      transpose: true,
      song: {
        select: {
          id: true, title: true, slug: true, category: true,
          artist: { select: { name: true, slug: true } },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return <FavoriteSongbook key={userId} userId={userId} favorites={favorites.map(({ song, transpose }) => ({ id: song.id, title: song.title, artist: song.artist.name, transpose,
    href: favoriteSongHref(song),
  }))} />
}
