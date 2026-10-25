import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import ArtistPhotoCredit from "@/app/components/ArtistPhotoCredit"
import ArtistWikiCredit from "@/app/components/ArtistWikiCredit"
import ArtistDiscography from "@/app/components/ArtistDiscography"
import ArtistImage from "@/app/components/ArtistImage"
import { getArtistImage } from "@/lib/artistPhotos"
import AdminPageActions from "@/app/components/AdminPageActions"
import { artistContentVersion } from "@/lib/adminContent/server"

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

  const image = getArtistImage(artistData)

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">

      <h1 className="text-3xl font-bold mb-4">
        {artistData.name}
      </h1>
      <AdminPageActions kind="artist" id={artistData.id} name={artistData.name} editHref={`/admin/artists/${encodeURIComponent(artistData.id)}/edit?from=info`} biography={Boolean(artistData.bio || artistData.bioShort)} version={artistContentVersion(artistData)} />

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

      <ArtistDiscography artistId={artistData.id} value={artistData.discography} />

      <Link
        href={`/pesme/${artistData.category}/${artistData.slug}`}
        className="text-blue-400 hover:underline"
      >
        ← Nazad na pesme
      </Link>

    </div>
  )
}
