import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { submissionUser } from "@/lib/submissions/server"
import { SubmissionError } from "@/lib/submissions/validation"
import { playlistFailure, privateHeaders, readablePlaylistWhere } from "@/lib/playlists/server"
import { songPageHref } from "@/lib/adminContent/paths"
import { performanceHref } from "@/lib/performance/model"
import { playbackTarget } from "@/lib/performance/recent"

export const dynamic = "force-dynamic"
export async function GET(request: Request) {
  try {
    const user = await submissionUser()
    const target = playbackTarget(Object.fromEntries(new URL(request.url).searchParams))
    if (!target) throw new SubmissionError(400, "Neispravni podaci.")
    if (target.kind === "playlist") {
      const row = await prisma.playlistSong.findFirst({
        where: { playlistId: target.playlistId, songId: target.songId, playlist: readablePlaylistWhere(target.playlistId, user.id) },
        select: { playlist: { select: { name: true } }, song: { select: { title: true, artist: { select: { name: true } } } } },
      })
      if (!row) throw new SubmissionError(404, "Playlista ili pesma nije dostupna.")
      return NextResponse.json({ ...target, href: performanceHref(target.playlistId, target.songId), title: row.song.title, artist: row.song.artist.name, playlistName: row.playlist.name }, { headers: privateHeaders })
    }
    const song = await prisma.song.findUnique({ where: { id: target.songId }, select: { title: true, slug: true, category: true, artist: { select: { name: true, slug: true, category: true } } } })
    if (!song) throw new SubmissionError(404, "Pesma nije pronadjena.")
    return NextResponse.json({ ...target, href: songPageHref(song, song.artist) + "?from=favorites&play=1", title: song.title, artist: song.artist.name }, { headers: privateHeaders })
  } catch (cause) { return playlistFailure(cause) }
}
