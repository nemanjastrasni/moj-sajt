import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { SubmissionError } from "@/lib/submissions/validation"
import { isReviewStatus, type ReviewStatus } from "./model"

export function songReviewVersion(song: { lyrics: string; chords: string | null }) {
  return createHash("sha256").update(JSON.stringify([song.lyrics, song.chords])).digest("hex")
}
export function validateSongReview(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SubmissionError(400, "Neispravni podaci.")
  const data = value as Record<string, unknown>
  if (!isReviewStatus(data.status) || !isReviewStatus(data.expectedStatus) || typeof data.version !== "string" || !/^[a-f0-9]{64}$/.test(data.version)) throw new SubmissionError(400, "Proveri oznaku pesme i osvezi stranicu.")
  return { status: data.status, expectedStatus: data.expectedStatus, version: data.version }
}
export async function setSongReview(songId: string, actorId: string, input: ReturnType<typeof validateSongReview>) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        const actor = await tx.user.findUnique({ where: { id: actorId }, select: { role: true, banned: true } })
        if (!actor || actor.banned || actor.role !== "admin") throw new SubmissionError(403, "Nije dozvoljeno.")
        // Lock the content row so even non-serializable import scripts cannot race a review.
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM public."Song" WHERE "id" = ${songId} FOR UPDATE`)
        const song = await tx.song.findUnique({ where: { id: songId }, select: { lyrics: true, chords: true, review: { select: { status: true } } } })
        if (!song) throw new SubmissionError(404, "Pesma nije pronadjena.")
        if (songReviewVersion(song) !== input.version) throw new SubmissionError(409, "Tekst ili akordi su izmenjeni. Osvezi pesmu i proveri je ponovo.")
        if ((song.review?.status ?? "unreviewed") !== input.expectedStatus) throw new SubmissionError(409, "Oznaku je promenio drugi administrator. Osvezi stranicu.")
        const data = { status: input.status, reviewedById: actorId, updatedAt: new Date() }
        await tx.songReview.upsert({ where: { songId }, create: { songId, ...data }, update: data })
        return { status: input.status as ReviewStatus, version: input.version }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 })
    } catch (error) {
      if (attempt < 2 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") continue
      throw error
    }
  }
}
