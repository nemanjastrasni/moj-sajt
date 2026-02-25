import { notFound } from "next/navigation"
import { getArtists } from "@/lib/data/registry"
import Link from "next/link"

type Props = {
  params: Promise<{
    category: string
    artist: string
  }>
}

export default async function ArtistInfoPage({ params }: Props) {
  const { category, artist } = await params

  const artists = getArtists()

 const artistData = artists.find(
  (a) => a.slug.toLowerCase() === artist.toLowerCase()
)

if (!artistData) {
  notFound()
}

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">

      {/* NAZIV */}
      <h1 className="text-3xl font-bold mb-4">
        {artistData.artistFull}
      </h1>

      {/* SLIKA */}
      {artistData.image && (
        <div className="mb-6">
          <img
            src={artistData.image}
            alt={artistData.artistFull}
            className="w-full max-w-md rounded-lg"
          />
        </div>
      )}

      {/* BIO */}
      {artistData.bio && (
        <div className="mb-8 whitespace-pre-line text-lg leading-relaxed">
          {artistData.bio}
        </div>
      )}

      {/* DISKOGRAFIJA */}
      {artistData.discography && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Diskografija
          </h2>

          {Array.isArray(artistData.discography) ? (
            <ul className="space-y-2">
              {artistData.discography.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          ) : (
            <div className="space-y-4">
              {Object.entries(artistData.discography).map(
                ([section, albums]) =>
                  albums && albums.length > 0 && (
                    <div key={section}>
                      <h3 className="font-semibold capitalize mb-2">
                        {section}
                      </h3>
                      <ul className="space-y-1">
                        {albums.map((album, i) => (
                          <li key={i}>
                            {album.title}
                            {album.year && ` (${album.year})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
              )}
            </div>
          )}
        </div>
      )}

      {/* NAZAD NA PESME */}
      <Link
        href={`/pesme/${category}/${artist}`}
        className="text-blue-400 hover:underline"
      >
        ← Nazad na pesme
      </Link>

    </div>
  )
}