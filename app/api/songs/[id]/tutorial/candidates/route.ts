import { NextResponse } from "next/server"
import { adminSameOrigin, requireSongAdmin } from "@/lib/adminSongs/server"
import { prisma } from "@/lib/prisma"
import { playlistId } from "@/lib/playlists/validation"
import { SubmissionError } from "@/lib/submissions/validation"
import { readLimitedJson, RequestBodyError } from "@/lib/auth/request"
import { discoverTutorials, tutorialQuery } from "@/lib/tutorials/discovery"
import { tutorialHeaders, tutorialFailure } from "@/lib/tutorials/server"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSongAdmin(), songId = playlistId((await context.params).id)
    adminSameOrigin(request)
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new SubmissionError(415, "Očekuju se JSON podaci.")
    try {
      const body = await readLimitedJson(request, 1024)
      if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(key => key !== "preview") || "preview" in body && typeof body.preview !== "boolean") throw new SubmissionError(400, "Neispravni podaci.")
      const song = await prisma.song.findUnique({ where: { id: songId }, select: { title: true, artist: { select: { name: true } } } })
      if (!song) throw new SubmissionError(404, "Pesma nije pronađena.")
      // Preview supplies a safe direct search link without consuming API quota.
      const result = "preview" in body && body.preview ? { query: tutorialQuery(song.title, song.artist.name), available: Boolean(process.env.YOUTUBE_API_KEY?.trim()), candidates: [] } : await discoverTutorials(song.title, song.artist.name, actor.id)
      return NextResponse.json({ songId, ...result }, { headers: tutorialHeaders })
    } catch (error) {
      if (error instanceof RequestBodyError) throw new SubmissionError(error.status, "Neispravni ili preveliki podaci.")
      throw error
    }
  } catch (cause) { return tutorialFailure(cause) }
}
