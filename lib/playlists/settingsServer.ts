import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { SubmissionError } from "../submissions/validation"
import { capoSource } from "../chords/capo"
import { parseSongSheet } from "../chords/songSheet"
import { playlistTransaction, readablePlaylistWhere } from "./server"
import type { PlayingSnapshot, PlayingValues, playingUpdate } from "./settings"

export async function activeSettingsOwner(tx: Prisma.TransactionClient, userId: string) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { banned: true } })
  if (!user || user.banned) throw new SubmissionError(403, "Nije dozvoljeno.")
}
export function checkSourceCapo(lyrics: string, values: PlayingValues) {
  if (values.capo !== null && capoSource(parseSongSheet(lyrics)).ambiguous) throw new SubmissionError(422, "Oznaka capoa u izvornom zapisu nije jasna. Preporuka nije dostupna.")
}
export async function readPlayingSetting(playlistId: string, songId: string, viewerId: string | null): Promise<PlayingSnapshot> {
  const item = await prisma.playlistSong.findFirst({
    where: { playlistId, songId, playlist: readablePlaylistWhere(playlistId, viewerId) },
    select: { id: true, playlist: { select: { userId: true } }, setting: { select: { userId: true, transpose: true, capo: true, version: true } } },
  })
  if (!item) throw new SubmissionError(404, "Playlista ili pesma nije dostupna.")
  const editable = Boolean(viewerId && item.playlist.userId === viewerId)
  const setting = editable && item.setting?.userId === viewerId ? item.setting : null
  if (editable && item.setting && !setting) throw new SubmissionError(403, "Nije dozvoljeno.")
  return { playlistId, songId, editable, setting: { entryId: item.id, version: setting?.version ?? 0, transpose: setting?.transpose ?? 0, capo: setting?.capo ?? null } }
}
export async function savePlayingSetting(playlistId: string, songId: string, userId: string, input: ReturnType<typeof playingUpdate>): Promise<PlayingSnapshot> {
  return playlistTransaction(async tx => {
    await activeSettingsOwner(tx, userId)
    const item = await tx.playlistSong.findFirst({ where: { playlistId, songId, playlist: { id: playlistId, userId } }, select: { id: true, song: { select: { lyrics: true } }, setting: { select: { userId: true, version: true } } } })
    if (!item) throw new SubmissionError(404, "Playlista ili pesma nije dostupna.")
    if (item.setting && item.setting.userId !== userId) throw new SubmissionError(403, "Nije dozvoljeno.")
    if (item.id !== input.entryId || (item.setting?.version ?? 0) !== input.version) throw new SubmissionError(409, "Podesavanja su izmenjena na drugom mestu. Ucitaj sacuvanu verziju.")
    checkSourceCapo(item.song.lyrics, input)
    const values = { transpose: input.transpose, capo: input.capo, version: input.version + 1, updatedAt: new Date() }
    if (item.setting) {
      const changed = await tx.playlistSongSetting.updateMany({ where: { playlistSongId: item.id, userId, version: input.version }, data: values })
      if (changed.count !== 1) throw new SubmissionError(409, "Podesavanja su izmenjena na drugom mestu. Ucitaj sacuvanu verziju.")
    } else await tx.playlistSongSetting.create({ data: { playlistSongId: item.id, userId, ...values } })
    return { playlistId, songId, editable: true, setting: { entryId: item.id, version: values.version, transpose: values.transpose, capo: values.capo } }
  })
}
