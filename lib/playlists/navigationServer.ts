import { prisma } from "@/lib/prisma"
import { playlistOrder, readablePlaylistWhere } from "./server"
import { SubmissionError } from "@/lib/submissions/validation"
import { playlistSongHref } from "@/lib/navigation/parent"
import type { PlaylistNavigation } from "./navigation"

export async function playlistNavigation(id: string, viewerId: string | null, current: string): Promise<PlaylistNavigation> {
  const list = await prisma.playlist.findFirst({
    where: readablePlaylistWhere(id, viewerId),
    select: { id: true, name: true, songs: { orderBy: playlistOrder, take: 2001,
      select: { songId: true, song: { select: { title: true, slug: true, artist: { select: { slug: true, category: true } } } } } } },
  })
  if (!list) throw new SubmissionError(404, "Playlista nije dostupna.")
  if (list.songs.length > 2000) throw new SubmissionError(413, "Playlista je prevelika za rezim sviranja.")
  if (!list.songs.some(item => item.songId === current)) throw new SubmissionError(404, "Pesma nije u ovoj playlisti.")
  return { id: list.id, name: list.name, current, songs: list.songs.map(item => ({ id: item.songId, title: item.song.title,
    href: playlistSongHref({ ...item.song, category: item.song.artist.category ?? "domace" }, `/plejliste/${list.id}`) })) }
}
