import snapshot from "./catalog-assessments.json"
import { difficultyLevels, type Difficulty } from "../music/difficultyModel"

type Assessment = { level: Difficulty | null; chords: string[] }
type Snapshot = { format: number; algorithmHash: string; songs: Record<string, [string, Difficulty | null, string[]]> }
const saved = snapshot as unknown as Snapshot
export const catalogAssessmentRevision = saved.algorithmHash

export function savedCatalogAssessment(id: string, sourceHash: string): Assessment | undefined {
  if (saved.format !== 1 || !Object.hasOwn(saved.songs, id)) return
  const row = saved.songs[id]
  if (row[0] !== sourceHash || row[1] !== null && !difficultyLevels.includes(row[1]) || !Array.isArray(row[2])) return
  return { level: row[1], chords: row[2] }
}
