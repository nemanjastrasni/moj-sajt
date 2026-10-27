import { prisma } from "@/lib/prisma"
import { hasBiographyContent, type BiographyArtist } from "./catalog"

export async function readBiographyArtists(category: string): Promise<BiographyArtist[]> {
  const artists = await prisma.artist.findMany({
    where: { category },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: { id: true, name: true, slug: true, category: true, image: true, bio: true, bioShort: true, discography: true },
  })
  return artists.filter(artist => artist.slug && hasBiographyContent(artist))
    .map(({ id, name, slug, category, image }) => ({ id, name, slug, category, image }))
}
