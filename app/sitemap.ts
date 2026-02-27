import { prisma } from "@/lib/prisma"
import type { MetadataRoute } from "next"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://gitarakordi.rs" // kasnije promeni kad kupiš domen

  const songs = await prisma.song.findMany({
    include: { artist: true },
  })

  const artists = await prisma.artist.findMany()

  const songUrls = songs.map((song) => ({
    url: `${baseUrl}/pesme/${song.artist.category}/${song.artist.slug}/${song.slug}`,
    lastModified: new Date(),
  }))

  const artistUrls = artists
    .filter((a) => a.category)
    .map((artist) => ({
      url: `${baseUrl}/pesme/${artist.category}/${artist.slug}`,
      lastModified: new Date(),
    }))

  const categoryUrls = ["domace", "strane", "narodne"].map((cat) => ({
    url: `${baseUrl}/pesme/${cat}`,
    lastModified: new Date(),
  }))

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
    },
    ...categoryUrls,
    ...artistUrls,
    ...songUrls,
  ]
}