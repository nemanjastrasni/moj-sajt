import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import { estimateDifficulty, songChords } from "./difficulty"

export async function getEasyGuitarSongs() {
  const songs = await prisma.song.findMany()

  return songs.filter(song => {
    return ["very_easy", "easy"].includes(estimateDifficulty(song).level ?? "")
  })
}

export async function getFourChordSongs() {
  const songs = await prisma.song.findMany()

  return songs.filter(song => {
    const chords = songChords(song)
    return chords.length === 4
  })
}
export async function getPlaylist(slug: string) {

  const playlists: Record<string, { title: string; description: string; query: Pick<Prisma.SongFindManyArgs, "where" | "take"> }> = {

    "easy-guitar": {
      title: "Easy Guitar Songs",
      description: "Lake pesme za gitaru za početnike.",
      query: {
        take: 50
      }
    },

    "acoustic-balkan": {
      title: "Acoustic Balkan Songs",
      description: "Akustične zabavne pesme za gitaru.",
      query: {
        where: { category: "domace" },
        take: 50
      }
    },

    "rock-90s": {
      title: "Rock Songs 90s",
      description: "Najbolje rock pesme iz 90-ih za gitaru.",
      query: {
        where: { category: "strane" },
        take: 50
      }
    },

    "lake-domace-pesme": {
      title: "Lake Zabavne Pesme za Gitaru",
      description: "Zabavne pesme koje su lake za sviranje na gitari.",
      query: {
        where: { category: "domace" },
        take: 50
      }
    },

    "lake-narodne-pesme": {
      title: "Lake Narodne Pesme za Gitaru",
      description: "Najpopularnije narodne pesme koje su lake za gitaru.",
      query: {
        where: { category: "narodne" },
        take: 50
      }
    }

  }

  const playlist = playlists[slug]

  if (!playlist) return null

  const songs = await prisma.song.findMany({
    ...playlist.query,
    include: { artist: true }
  })

  return {
    ...playlist,
    songs
  }
}
