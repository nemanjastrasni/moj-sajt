import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { estimateDifficulty } from "./difficulty"
import { assessmentRevision, type SongSource } from "./storedAssessment"

export function assessmentSourceHash(song: SongSource) {
  return createHash("sha256").update(song.lyrics ?? "", "utf8").update(Buffer.from([0]))
    .update(Buffer.from([song.chords == null ? 0 : 1])).update(song.chords ?? "", "utf8").digest("hex")
}
export function assessSong(song: SongSource) {
  return { version: assessmentRevision, sourceHash: assessmentSourceHash(song), ...estimateDifficulty(song) }
}
// Also used by the maintenance CLI through pg's parameterized text/values API.
export function assessmentUpdate(id: string, song: SongSource) {
  return Prisma.sql`UPDATE public."Song" SET "musicAssessment"=${JSON.stringify(assessSong(song))}::jsonb
    WHERE id=${id} AND lyrics IS NOT DISTINCT FROM ${song.lyrics ?? ""} AND chords IS NOT DISTINCT FROM ${song.chords ?? null}`
}
export async function persistSongAssessment(tx: Pick<Prisma.TransactionClient, "$executeRaw">, id: string, song: SongSource) {
  if (await tx.$executeRaw(assessmentUpdate(id, song)) !== 1) throw Error("Song changed while saving its music assessment")
}
