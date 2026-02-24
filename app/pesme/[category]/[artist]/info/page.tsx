import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

type Props = {
  params: Promise<{
    category: string
    artist: string
  }>
}

export default async function ArtistInfoPage({ params }: Props) {
  const { category, artist } = await params

  const artistData = await prisma.artist.findFirst({
    where: {
      slug: artist,
      category: category,
    },
  })

  if (!artistData) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 text-white">

      <h1 className="text-3xl font-bold mb-6">
        {artistData.name}
      </h1>

      {artistData.image && (
        <div className="mb-6">
          <img
            src={artistData.image}
            alt={artistData.name}
            className="w-full max-w-md rounded-lg"
          />
        </div>
      )}

      {artistData.bio && (
        <div className="mb-10 whitespace-pre-line text-lg leading-relaxed text-gray-300">
          {artistData.bio}
        </div>
      )}

      {Array.isArray(artistData.discography) && (
        <div className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">
            Diskografija
          </h2>

          <ul className="space-y-2 text-gray-300">
            {artistData.discography.map((album, i) => (
              <li key={i}>{String(album)}</li>
            ))}
          </ul>
        </div>
      )}

      <Link
        href={`/pesme/${category}/${artist}`}
        className="text-blue-400 hover:underline"
      >
        ← Nazad na pesme
      </Link>

    </div>
  )
}