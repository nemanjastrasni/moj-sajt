import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import type { Metadata } from "next"

export async function generateMetadata(
  { params }: any
): Promise<Metadata> {

  const { artist } = params

  const artistData = await prisma.artist.findUnique({
    where: { slug: artist },
  })

  if (!artistData) {
    return {
      title: "Izvođač nije pronađen",
    }
  }

  return {
    title: `${artistData.name} – Biografija, Diskografija i Pesme`,
    description: `Biografija, diskografija i pesme izvođača ${artistData.name}.`,
  }
}

export default async function ArtistPage({ params }: any) {

  const { category, artist } = params

  const artistData = await prisma.artist.findFirst({
    where: {
      slug: artist,
      category: category,
    },
    include: {
      songs: {
        orderBy: { title: "asc" },
      },
    },
  })

  if (!artistData) notFound()

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 text-white">
      <h1 className="text-3xl font-bold mb-6">
        {artistData.name}
      </h1>

      <div className="mb-10">
        <Link
          href={`/pesme/${artistData.category}/${artistData.slug}/info`}
          className="inline-block border border-red-500 text-red-400 px-4 py-1 rounded hover:bg-red-500 hover:text-white transition"
        >
          Biografija →
        </Link>
      </div>

      {artistData.songs.length === 0 ? (
        <p className="text-gray-400">Nema pesama.</p>
      ) : (
        <ul className="space-y-4">
          {artistData.songs.map((song) => (
            <li key={song.id}>
              <Link
                href={`/pesme/${artistData.category}/${artistData.slug}/${song.slug}`}
                className="text-blue-400 hover:text-blue-300 hover:underline text-lg"
              >
                {song.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}