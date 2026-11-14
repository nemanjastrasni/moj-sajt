import { cache } from "react"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { estimateDifficulty } from "@/lib/music/difficulty"
import { assessmentRevision, storedAssessment } from "@/lib/music/storedAssessment"
import { Prisma } from "@prisma/client"
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
  const { songs, sources } = await prisma.$transaction(async tx => {
  const songs = await tx.song.findMany({
    where: { OR: [{ artistId }, { performers: { some: { artistId } } }] },
    select: { id: true, slug: true, title: true, musicAssessment: true,
      artist: { select: { slug: true, category: true } }, performers: performerSelect },
    orderBy: [{ title: "asc" }, { id: "asc" }],
  })
  const missing = songs.filter(song => !storedAssessment(song.musicAssessment)).map(song => song.id)
  const sources = missing.length ? await tx.song.findMany({ where: { id: { in: missing } }, select: { id: true, lyrics: true, chords: true } }) : []
  return { songs, sources }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 15000 })
  const byId = new Map(sources.map(song => [song.id, song]))
  return songs.map(song => {
    const source = byId.get(song.id)
    const assessment = storedAssessment(song.musicAssessment) ?? (source ? estimateDifficulty(source) : undefined)
    if (!assessment) throw Error("Artist source snapshot is incomplete")
    return { id: song.id, slug: song.slug, title: song.title, artist: song.artist, performers: song.performers,
      assessment: { level: assessment.level, hasChords: assessment.chords.length > 0 } }
  })
}), ["public-artist-songs-v2", assessmentRevision], { revalidate: 300, tags: ["public-artist-songs"] })

export const readArtistSongCards = cache(async (artistId: string) => artistId ? cachedSongs(artistId) : [])
