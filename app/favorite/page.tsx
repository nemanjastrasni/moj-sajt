import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import Link from "next/link"

export default async function FavoritePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return (
      <div style={{ padding: "40px" }}>
        Morate biti ulogovani.
      </div>
    )
  }

  const userId = (session.user as any).id

  const favorites = await prisma.favorite.findMany({
    where: {
      userId,
    },
    include: {
      song: {
        include: {
          artist: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "30px" }}>
        Favoriti
      </h1>

      {favorites.length === 0 ? (
        <p>Nema omiljenih pesama.</p>
      ) : (
        <div style={{ display: "grid", gap: "14px" }}>
          {favorites.map((fav: any) => (
            <Link
              key={fav.id}
              href={`/pesme/${fav.song.category}/${fav.song.artist.slug}/${fav.song.slug}`}
            >
              <span style={{ color: "#9ca3af" }}>
                {fav.song.artist?.name}
              </span>{" "}
              <span style={{ color: "white" }}>
                — {fav.song.title}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}