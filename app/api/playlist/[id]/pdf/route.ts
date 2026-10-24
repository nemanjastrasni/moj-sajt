import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { submissionBody } from "@/lib/submissions/server"
import { SubmissionError } from "@/lib/submissions/validation"
import { MAX_BOOK_SONGS, MAX_PDF_CHARACTERS } from "@/lib/songbook/model"
import { playlistId } from "@/lib/playlists/validation"
import { playlistFailure, playlistOrder, playlistViewerId, privateHeaders, readablePlaylistWhere } from "@/lib/playlists/server"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const id = playlistId((await context.params).id)
    const body = await submissionBody(request) as { songIds?: unknown }
    if (!Array.isArray(body?.songIds) || body.songIds.length < 1 || body.songIds.length > MAX_BOOK_SONGS) throw new SubmissionError(400, "PDF playlista moze imati od 1 do 100 pesama.")
    const expected = body.songIds.map(playlistId)
    const playlist = await prisma.playlist.findFirst({ where: readablePlaylistWhere(id, await playlistViewerId()), select: {
      name: true, songs: { orderBy: playlistOrder, take: MAX_BOOK_SONGS + 1, select: { song: { select: { id: true, title: true, lyrics: true, artist: { select: { name: true } } } } } },
    } })
    if (!playlist) throw new SubmissionError(404, "Playlista nije dostupna.")
    if (!playlist.songs.length || playlist.songs.length > MAX_BOOK_SONGS) throw new SubmissionError(400, "PDF playlista moze imati od 1 do 100 pesama.")
    if (expected.length !== playlist.songs.length || playlist.songs.some((item, index) => item.song.id !== expected[index])) throw new SubmissionError(409, "Playlista je izmenjena. Osvezi je pre PDF izvoza.")
    const songs = playlist.songs.map(({ song }) => ({ id: song.id, title: song.title, artist: song.artist.name, lyrics: song.lyrics, transpose: 0 }))
    if (songs.some(song => !song.lyrics.trim() || song.lyrics.length > 100000) || songs.reduce((sum, song) => sum + song.lyrics.length, 0) > MAX_PDF_CHARACTERS || new TextEncoder().encode(JSON.stringify({ name: playlist.name, songs })).byteLength > 3800000) throw new SubmissionError(413, "Knjiga je prevelika ili neke pesme nemaju tekst. Izaberi manje pesama.")
    return NextResponse.json({ name: playlist.name, songs }, { headers: privateHeaders })
  } catch (error) { return playlistFailure(error) }
}
