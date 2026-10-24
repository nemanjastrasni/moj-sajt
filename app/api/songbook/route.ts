import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { submissionBody, submissionFailure, submissionUser } from "@/lib/submissions/server"
import { SubmissionError } from "@/lib/submissions/validation"
import { MAX_PDF_CHARACTERS, validateBookEntries } from "@/lib/songbook/model"

export async function POST(request: Request) {
  try {
    const user = await submissionUser()
    const body = await submissionBody(request)
    let entries
    try { entries = validateBookEntries((body as { songs?: unknown })?.songs) }
    catch (error) { throw new SubmissionError(400, error instanceof Error ? error.message : "Neispravni podaci.") }
    const favorites = await prisma.favorite.findMany({ where: { userId: user.id, songId: { in: entries.map(entry => entry.id) } },
      select: { song: { select: { id: true, title: true, lyrics: true, artist: { select: { name: true } } } } } })
    const available = new Map(favorites.map(favorite => [favorite.song.id, favorite.song]))
    if (entries.some(entry => !available.has(entry.id))) throw new SubmissionError(403, "Neke pesme vise nisu u tvojim favoritima. Osvezi spisak.")
    const songs = entries.map(entry => {
      const song = available.get(entry.id)!
      return { ...entry, title: song.title, artist: song.artist.name, lyrics: song.lyrics }
    })
    if (songs.some(song => !song.lyrics.trim() || song.lyrics.length > 100000) || songs.reduce((sum, song) => sum + song.lyrics.length, 0) > MAX_PDF_CHARACTERS) throw new SubmissionError(413, "Knjiga je prevelika ili neke pesme nemaju tekst. Izaberi manje pesama.")
    if (new TextEncoder().encode(JSON.stringify({ songs })).byteLength > 3800000) throw new SubmissionError(413, "Knjiga je prevelika ili neke pesme nemaju tekst. Izaberi manje pesama.")
    return NextResponse.json({ songs }, { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } })
  } catch (error) { return submissionFailure(error) }
}
