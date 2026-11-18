import { prisma } from "@/lib/prisma"
import { playlistOrder } from "@/lib/playlists/server"
import { submissionUser } from "@/lib/submissions/server"
import { SubmissionError } from "@/lib/submissions/errors"
import { MAX_OFFLINE_BYTES, MAX_OFFLINE_SONGS, offlineSignature, type OfflinePlaylist } from "./model"

export async function readOfflinePlaylist(id: string): Promise<OfflinePlaylist> {
  const user = await submissionUser()
  const list = await prisma.playlist.findFirst({ where: { id, userId: user.id }, select: {
    id: true, name: true, songs: { orderBy: playlistOrder, take: MAX_OFFLINE_SONGS + 1, select: {
      setting: { select: { userId: true, transpose: true, capo: true } },
      song: { select: { id: true, title: true, lyrics: true, chords: true, artist: { select: { name: true } },
        performers: { orderBy: { position: "asc" }, select: { artist: { select: { name: true } } } } } },
    } },
  } })
  if (!list) throw new SubmissionError(404, "Lična plejlista nije dostupna.")
  if (!list.songs.length || list.songs.length > MAX_OFFLINE_SONGS) throw new SubmissionError(422, "Offline lista može imati od 1 do 100 pesama. Podeli veću listu na manje.")
  const songs = list.songs.map(({ song, setting }) => ({ id: song.id, title: song.title,
    artist: song.performers.length >= 2 ? song.performers.map(row => row.artist.name).join(" & ") : song.artist.name,
    lyrics: song.lyrics ?? "", chords: song.chords, transpose: setting?.userId === user.id ? setting.transpose : 0,
    capo: setting?.userId === user.id ? setting.capo : null,
  }))
  const snapshot: OfflinePlaylist = { version: 1, id: list.id, ownerId: user.id, name: list.name, savedAt: new Date().toISOString(), signature: offlineSignature(list.id, list.name, songs), songs }
  if (Buffer.byteLength(JSON.stringify(snapshot), "utf8") > MAX_OFFLINE_BYTES) throw new SubmissionError(413, "Lista je prevelika za jedno preuzimanje. Podeli je na manje liste.")
  return snapshot
}
