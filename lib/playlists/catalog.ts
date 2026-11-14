import { estimateDifficulty, type MusicalSong } from "../music/difficulty"
import { matchesCatalog as matchesAssessment } from "./catalog-model"
export { catalogEntries, catalogEntry } from "./catalog-model"

// Compatibility for callers that explicitly ask to assess source content.
export function matchesCatalog(song: MusicalSong & { category: string }, slug: string, assessment = estimateDifficulty(song)) {
  return matchesAssessment(song, slug, assessment)
}
