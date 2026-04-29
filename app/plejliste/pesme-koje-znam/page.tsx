import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function SongsYouCanPlayPage() {
  const session = await getServerSession(authOptions)

if (!session || !session.user || !session.user.email) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10 text-white">
      Morate biti ulogovani.
    </div>
  )
}

const level = "beginner"



  let allowedDifficulties = ["beginner"]

  if (level === "intermediate") {
    allowedDifficulties = ["beginner", "intermediate"]
  }

  if (level === "advanced") {
    allowedDifficulties = ["beginner", "intermediate", "advanced"]
  }

  const songs = await prisma.song.findMany({
    where: {
      difficulty: {
        in: allowedDifficulties,
      },
    },
    include: {
      artist: true,
    },
    orderBy: {
      popularity: "desc",
    },
  })

  return (
  <div className="max-w-6xl mx-auto px-6 py-12 text-white">
    <h1 className="text-4xl font-bold text-center mb-3">
      Pesme koje mogu da sviram
    </h1>

    <p className="text-center text-gray-400 mb-10">
      Vaš nivo: {level}
    </p>

    <div className="space-y-3">
      {songs.map((song) => (
        <Link
          key={song.id}
          href={`/pesme/${song.category}/${song.artist.slug}/${song.slug}`}
          className="block border-b border-zinc-800 pb-3 hover:text-yellow-400 transition"
        >
          <div className="text-lg font-medium">
            {song.title}
          </div>

          <div className="text-sm text-gray-400">
            {song.artist.name} • {song.difficulty}
          </div>
        </Link>
      ))}
    </div>
  </div>
)
}