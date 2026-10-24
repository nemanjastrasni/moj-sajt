import UiText from "@/app/components/UiText"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import FavoriteSongbook from "@/app/components/FavoriteSongbook"

export default async function FavoritePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return (
      <div style={{ padding: "40px" }}>
        <UiText text="Morate biti ulogovani." />
      </div>
    )
  }

  const userId = session.user.id

  const favorites = await prisma.favorite.findMany({
    where: {
      userId,
    },
    select: {
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

  return <FavoriteSongbook key={userId} userId={userId} favorites={favorites.map(({ song }) => ({ id: song.id, title: song.title, artist: song.artist.name,
    href: "/pesme/" + [song.category, song.artist.slug, song.slug].map(encodeURIComponent).join("/"),
  }))} />
}
