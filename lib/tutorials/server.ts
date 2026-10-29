import { randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { contentAdmin } from "@/lib/adminContent/server"
import { adminSongFailure } from "@/lib/adminSongs/server"
import { playlistTransaction } from "@/lib/playlists/server"
import { SubmissionError } from "@/lib/submissions/validation"
import type { tutorialInput, TutorialSnapshot } from "./model"
const select = { videoId: true, title: true, version: true } as const
export const tutorialHeaders = { "Cache-Control": "private, no-store", Vary: "Cookie" }
export async function readTutorial(songId: string): Promise<TutorialSnapshot> {
  const admin = await contentAdmin()
  if (!await prisma.song.findUnique({ where: { id: songId }, select: { id: true } })) throw new SubmissionError(404, "Pesma nije pronadjena.")
  return { songId, editable: Boolean(admin), tutorial: await prisma.songTutorial.findUnique({ where: { songId }, select }) }
}
export async function writeTutorial(songId: string, actorId: string, input: ReturnType<typeof tutorialInput>, remove: boolean): Promise<TutorialSnapshot> {
  return playlistTransaction(async tx => {
    const actor = await tx.user.findUnique({ where: { id: actorId }, select: { role: true, banned: true } })
    if (!actor || actor.banned || actor.role !== "admin") throw new SubmissionError(403, "Nije dozvoljeno.")
    const songs = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM public."Song" WHERE id = ${songId} FOR UPDATE`)
    if (!songs.length) throw new SubmissionError(404, "Pesma nije pronadjena.")
    const before = await tx.songTutorial.findUnique({ where: { songId }, select })
    if ((before?.version ?? null) !== input.expectedVersion) throw new SubmissionError(409, "Tutorijal je izmenjen na drugom mestu. U\u010ditaj sa\u010duvanu verziju.")
    if (remove) {
      if (!before) throw new SubmissionError(404, "Tutorijal nije dostupan.")
      await tx.songTutorial.delete({ where: { songId } })
      return { songId, editable: true, tutorial: null }
    }
    const data = { videoId: input.videoId, title: input.title, version: randomUUID(), updatedById: actorId, updatedAt: new Date() }
    const tutorial = await tx.songTutorial.upsert({ where: { songId }, create: { songId, ...data }, update: data, select })
    return { songId, editable: true, tutorial }
  })
}
export function tutorialFailure(cause: unknown) {
  const response = adminSongFailure(cause)
  for (const [key, value] of Object.entries(tutorialHeaders)) response.headers.set(key, value)
  return response
}
