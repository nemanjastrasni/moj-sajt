import type { SongSource } from "./storedAssessment"
import type { Difficulty } from "./difficultyModel"

// Public reads normally have no missing values. Keep the musical parser out of
// their module initialization; only load it for the source rows that need it.
export async function assessMissingSongs(songs: readonly (SongSource & { id: string })[]) {
  const assessments = new Map<string, { level: Difficulty | null; chords: string[] }>()
  if (!songs.length) return assessments
  const { estimateDifficulty } = await import("./difficulty")
  for (const song of songs) assessments.set(song.id, estimateDifficulty(song))
  return assessments
}
