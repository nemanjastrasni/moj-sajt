import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function ArtistPage({ params }: any) {
  const artist = await prisma.artist.findUnique({
    where: { slug: params.artist }
  })

  if (!artist) notFound()

  return <div>{artist.name}</div>
}