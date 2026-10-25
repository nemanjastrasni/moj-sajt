import { prisma } from "@/lib/prisma"
import { playlistOrder, readablePlaylistWhere } from "../playlists/server"
import { SubmissionError } from "../submissions/validation"
import { MAX_PERFORMANCE_SONGS, type PerformanceSnapshot } from "./model"

export async function performanceSnapshot(id: string, viewerId: string | null, songId?: string): Promise<PerformanceSnapshot> {
  const playlist = await prisma.playlist.findFirst({
    where: readablePlaylistWhere(id, viewerId),
    select: { id: true, name: true, songs: { orderBy: playlistOrder, take: MAX_PERFORMANCE_SONGS + 1, select: { songId: true, song: { select: { title: true, artist: { select: { name: true } } } } } } },
  })
  if (!playlist) throw new SubmissionError(404, "Playlista nije dostupna.")
  if (!playlist.songs.length) throw new SubmissionError(422, "Nema pesama.")
  if (playlist.songs.length > MAX_PERFORMANCE_SONGS) throw new SubmissionError(413, "Playlista je prevelika za rezim sviranja.")
  const selected = songId ?? playlist.songs[0].songId
  if (!playlist.songs.some(item => item.songId === selected)) throw new SubmissionError(404, "Pesma nije u ovoj playlisti.")
  // Recheck access when reading lyrics, in case visibility changed after the roster read.
  const item = await prisma.playlistSong.findFirst({
    where: { playlistId: id, songId: selected, playlist: readablePlaylistWhere(id, viewerId) },
    select: { song: { select: { id: true, title: true, lyrics: true, artist: { select: { name: true } } } } },
  })
  if (!item) throw new SubmissionError(404, "Playlista ili pesma nije dostupna.")
  if (item.song.lyrics.length > 100000) throw new SubmissionError(413, "Pesma je prevelika za rezim sviranja.")
  return { id: playlist.id, name: playlist.name, songs: playlist.songs.map(row => ({ id: row.songId, title: row.song.title, artist: row.song.artist.name })), current: { id: item.song.id, title: item.song.title, artist: item.song.artist.name, lyrics: item.song.lyrics } }
}
