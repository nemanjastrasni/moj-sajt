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
  const { artist } = await params

  const artistData = await prisma.artist.findFirst({
    where: {
      slug: artist,
    },
  })

  if (!artistData) notFound()

  // Normalizacija diskografije (radi i za string i za array)
  let discography: string[] = []

  if (Array.isArray(artistData.discography)) {
    discography = artistData.discography as string[]
  } else if (typeof artistData.discography === "string") {
    discography = artistData.discography
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">

      <h1 className="text-3xl font-bold mb-4">
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
        <div className="mb-8 whitespace-pre-line text-lg leading-relaxed">
          {artistData.bio}
        </div>
      )}

      {discography.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Diskografija
          </h2>

          <ul className="space-y-2">
            {discography.map((album, i) => (
              <li key={i}>{album}</li>
            ))}
          </ul>
        </div>
      )}

      <Link
        href={`/pesme/${artistData.category}/${artistData.slug}`}
        className="text-blue-400 hover:underline"
      >
        ← Nazad na pesme
      </Link>

    </div>
  )
}