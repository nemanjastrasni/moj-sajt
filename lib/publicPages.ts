import { cache } from "react"
import { prisma } from "@/lib/prisma"
import { performerSelect } from "@/lib/artists/performers"
import { isPublicCategory } from "@/lib/seo/site"

export const getPublicSong = cache(async (category: string, artist: string, slug: string) => {
  if (!isPublicCategory(category)) return null
  return prisma.song.findFirst({
    where: { slug, artist: { slug: artist, category } },
    select: { id: true, title: true, slug: true, lyrics: true, chords: true, category: true,
      artist: { select: { id: true, name: true, slug: true, category: true } }, performers: performerSelect },
  })
})

export const getPublicArtist = cache(async (category: string, slug: string) => {
  if (!isPublicCategory(category)) return null
  return prisma.artist.findFirst({ where: { category, slug } })
})
