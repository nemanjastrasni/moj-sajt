import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{
    category: string
  }>
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params

  const artists = await prisma.artist.findMany({
    where: { category },
    include: { songs: true },
  })

  if (!artists.length) return notFound()

  return (
    <div style={{ padding: "40px" }}>
      <h1>{category.toUpperCase()}</h1>

      <ul>
        {artists.flatMap((artist) =>
          artist.songs.map((song) => (
            <li key={song.id}>
              <Link
                href={`/pesme/${category}/${artist.slug}/${song.slug}`}
              >
                {artist.name} - {song.title}
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}