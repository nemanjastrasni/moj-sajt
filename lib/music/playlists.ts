import { prisma } from "@/lib/prisma"

export async function getPlaylist(slug: string) {

  if (slug === "easy-guitar") {
    return prisma.song.findMany({
      where: {
        chords: {
          contains: "G"
        }
      },
      take: 50,
      include: { artist: true }
    })
  }

  if (slug === "rock-90s") {
    return prisma.song.findMany({
      where: {
        category: "strane"
      },
      take: 50,
      include: { artist: true }
    })
  }

  if (slug === "acoustic-balkan") {
    return prisma.song.findMany({
      where: {
        category: "domace"
      },
      take: 50,
      include: { artist: true }
    })
  }

  return []
}