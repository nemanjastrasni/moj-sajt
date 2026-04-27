import Link from "next/link"
import { prisma } from "@/lib/prisma"

export default async function Top50Page({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params

  const titleMap: Record<string, string> = {
    domace: "Top 50 Domaćih",
    strane: "Top 50 Stranih",
    narodne: "Top 50 Narodnih",
  }

  const songs = await prisma.song.findMany({
    where: {
      category,
    },
    orderBy: {
      popularity: "desc",
    },
    take: 50,
    include: {
      artist: true,
    },
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 text-white">
      <Link
        href="/plejliste"
        className="inline-block mb-8 px-4 py-2 rounded-full border border-gray-700 hover:bg-gray-800"
      >
        ← Nazad
      </Link>

      <h1 className="text-4xl font-bold mb-10">
        {titleMap[category] || "Top 50"}
      </h1>

      <div className="space-y-4">
        {songs.map((song) => (
          <Link
            key={song.id}
            href={`/pesme/${category}/${song.artist.slug}/${song.slug}`}
            className="block border-b border-gray-800 pb-3 hover:text-yellow-400 transition"
          >
            {song.artist.name} — {song.title}
          </Link>
        ))}
      </div>
    </div>
  )
}