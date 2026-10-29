import { prisma } from "@/lib/prisma"
import Link from "next/link"
import UiText from "@/app/components/UiText"
import { playlistSongHref } from "@/lib/navigation/parent"

export const dynamic = "force-dynamic"

export default async function Page() {
  const songs = await prisma.song.findMany({
    where: {
      category: "narodne",
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
        <UiText text="Top 50 narodnih" />
      </h1>

      {songs.map((song) => (
        <Link
          key={song.id}
          href={playlistSongHref(song, "/top-50/narodne")}
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
