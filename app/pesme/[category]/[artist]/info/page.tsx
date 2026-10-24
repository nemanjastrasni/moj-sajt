import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import ArtistPhotoCredit from "@/app/components/ArtistPhotoCredit"
import ArtistWikiCredit from "@/app/components/ArtistWikiCredit"
import { normalizeDiscography } from "@/lib/discography"
import ArtistImage from "@/app/components/ArtistImage"
import { getArtistImage } from "@/lib/artistPhotos"

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
  const discography = normalizeDiscography(artistData.discography)
  const image = getArtistImage(artistData)

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">

      <h1 className="text-3xl font-bold mb-4">
        {artistData.name}
      </h1>

      {image && (
        <div className="mb-6">
          <ArtistImage src={image} name={artistData.name} variant="portrait" priority />
        </div>
      )}

      <ArtistPhotoCredit image={image} />

      {artistData.bio && (
        <div className="mb-8 whitespace-pre-line text-lg leading-relaxed">
          {artistData.bio}
          <ArtistWikiCredit artistId={artistData.id} field="bio" value={artistData.bio} />
        </div>
      )}

      {discography.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            {discography.every(album => album.kind === "studio") ? "Studijski albumi / Studio albums" : "Diskografija"}
          </h2>

          <ul className="space-y-2">
            {discography.map((album, i) => (
              <li key={i} className="break-words">{album.title}{album.year ? ` (${album.year})` : ""}</li>
            ))}
          </ul>
          <ArtistWikiCredit artistId={artistData.id} field="discography" value={artistData.discography} />
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
