import { cache } from "react"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { estimateDifficulty } from "@/lib/music/difficulty"
import { isPublicCategory } from "@/lib/seo/site"
import { isResolvedCollaboration, performerSelect } from "./performers"

const pending = new Map<string, Promise<unknown>>()
function sharePending<T>(key: string, read: () => Promise<T>): Promise<T> {
  const existing = pending.get(key) as Promise<T> | undefined
  if (existing) return existing
  const request = read().finally(() => { if (pending.get(key) === request) pending.delete(key) })
  pending.set(key, request)
  return request
}

export function artistInitial(name: string) {
  const upper = name.trim().toUpperCase()
  return ["DŽ", "LJ", "NJ"].find(prefix => upper.startsWith(prefix)) ?? upper[0] ?? ""
}

const cachedArtists = unstable_cache(async (category: string) => sharePending("artists:" + category, async () => {
  const artists = await prisma.artist.findMany({
    where: { category }, orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, category: true, image: true,
      songs: { select: { id: true, performers: { select: { artistId: true } } } }, performances: { select: { songId: true } } },
  })
  return artists.map(artist => ({ id: artist.id, name: artist.name, slug: artist.slug, category: artist.category, image: artist.image,
    _count: { songs: artist.songs.length }, songCount: new Set([...artist.songs.map(song => song.id), ...artist.performances.map(row => row.songId)]).size,
    collaboration: isResolvedCollaboration(artist.songs) }))
}), ["public-artist-index-v1"], { revalidate: 300, tags: ["public-artist-index"] })

export const readArtistCards = cache(async (category: string) => isPublicCategory(category) ? cachedArtists(category) : [])
export const readLetterArtistCards = cache(async (category: string, letter: string) => (await readArtistCards(category)).filter(artist => !artist.collaboration &&
  (letter === "#" ? !/^[A-ZČĆŽŠĐ]/.test(artist.name.trim().toUpperCase()) : artistInitial(artist.name) === letter)))

const cachedSongs = unstable_cache(async (artistId: string) => sharePending("songs:" + artistId, async () => {
  const songs = await prisma.song.findMany({
    where: { OR: [{ artistId }, { performers: { some: { artistId } } }] },
    select: { id: true, slug: true, title: true, chords: true, lyrics: true,
      artist: { select: { slug: true, category: true } }, performers: performerSelect },
    orderBy: [{ title: "asc" }, { id: "asc" }],
  })
  return songs.map(song => {
    const assessment = estimateDifficulty(song)
    return { id: song.id, slug: song.slug, title: song.title, artist: song.artist, performers: song.performers,
      assessment: { level: assessment.level, hasChords: assessment.chords.length > 0 } }
  })
}), ["public-artist-songs-v1"], { revalidate: 300, tags: ["public-artist-songs"] })

export const readArtistSongCards = cache(async (artistId: string) => artistId ? cachedSongs(artistId) : [])
