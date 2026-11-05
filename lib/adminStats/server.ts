import { Prisma } from "@prisma/client"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireSongAdmin } from "@/lib/adminSongs/server"
import { addArtistCounts, addSongCounts, emptySongCounts, type AdminStatistics } from "./model"

export const ADMIN_STATS_TAG = "admin-catalog-stats"
const BATCH_SIZE = 500

// Cache aggregate counts only. Authorize every request outside the data cache.
const cachedStatistics = unstable_cache(async (): Promise<AdminStatistics> => {
  return prisma.$transaction(async tx => {
    const songs = emptySongCounts()
    const artists = { artists: 0, biographies: 0, discographies: 0 }
    let lastSong: string | undefined, lastArtist: string | undefined
    for (;;) {
      const rows = await tx.song.findMany({
        select: { id: true, lyrics: true, chords: true }, orderBy: { id: "asc" }, take: BATCH_SIZE,
        ...(lastSong ? { cursor: { id: lastSong }, skip: 1 } : {}),
      })
      addSongCounts(songs, rows)
      if (rows.length < BATCH_SIZE) break
      lastSong = rows[rows.length - 1].id
    }
    for (;;) {
      const rows = await tx.artist.findMany({
        select: { id: true, bio: true, bioShort: true, discography: true }, orderBy: { id: "asc" }, take: BATCH_SIZE,
        ...(lastArtist ? { cursor: { id: lastArtist }, skip: 1 } : {}),
      })
      addArtistCounts(artists, rows)
      if (rows.length < BATCH_SIZE) break
      lastArtist = rows[rows.length - 1].id
    }
    const users = await tx.user.count()
    return { ...songs, ...artists, users, calculatedAt: new Date().toISOString() }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 30000 })
}, ["admin-catalog-statistics-v1"], { revalidate: 300, tags: [ADMIN_STATS_TAG] })

export async function readAdminStatistics() {
  await requireSongAdmin()
  return cachedStatistics()
}
