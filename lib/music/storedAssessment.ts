import version from "./assessment-version.json"
import { difficultyLevels, type Difficulty } from "./difficultyModel"

export const assessmentRevision = version.algorithmHash
export type SongSource = { lyrics?: string | null; chords?: string | null }
export type MusicAssessment = { version: string; sourceHash: string; level: Difficulty | null; chords: string[] }
// The database trigger guarantees sourceHash matches the current source text.
// A parser revision change falls back to current parsing until the backfill runs.
export function storedAssessment(value: unknown): MusicAssessment | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return
  const row = value as MusicAssessment
  if (row.version !== assessmentRevision || !/^[a-f0-9]{64}$/.test(row.sourceHash) ||
      !(row.level === null || difficultyLevels.includes(row.level)) || !Array.isArray(row.chords) ||
      row.chords.some(chord => typeof chord !== "string") || (row.level === null) !== (row.chords.length === 0)) return
  return row
}
