import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function Page() {
  const songs = await prisma.song.findMany({
    where: {
      category: "domace",
    },
    include: {
      artist: true,
    },
    orderBy: {
      popularity: "desc",
    },
    take: 50,
  })

  return (
    <div style={{ padding: "40px" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "30px" }}>
        Top 50 Domaćih
      </h1>

      {songs.map((song) => (
        <Link
          key={song.id}
          href={`/pesme/${song.category}/${song.artist.slug}/${song.slug}`}
          className="block py-2 border-b border-gray-800"
        >
          <span className="text-gray-400">
            {song.artist?.name}
          </span>{" "}
          <span className="text-white">
            - {song.title}
          </span>
        </Link>
      ))}
    </div>
  )
}