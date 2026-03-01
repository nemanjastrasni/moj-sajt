import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: any) {

  const artistData = await prisma.artist.findUnique({
    where: { slug: params.artist },
  })

  if (!artistData) {
    return { title: "Izvođač nije pronađen" }
  }

  return {
    title: `${artistData.name} – Pesme`,
  }
}

export default async function ArtistPage({ params }: any) {

  const artistData = await prisma.artist.findFirst({
    where: {
      slug: params.artist,
      category: params.category,
    },
    include: {
      songs: true,
    },
  })

  if (!artistData) notFound()

  return (
    <div>
      <h1>{artistData.name}</h1>

      {artistData.songs.map((song) => (
        <div key={song.id}>
          <Link href={`/pesme/${params.category}/${params.artist}/${song.slug}`}>
            {song.title}
          </Link>
        </div>
      ))}
    </div>
  )
}