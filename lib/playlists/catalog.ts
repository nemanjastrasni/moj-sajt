import { difficultyLabels, difficultyLevels, estimateDifficulty, type MusicalSong } from "../music/difficulty"

export const catalogEntries = [
  { slug: "veoma-lako", title: difficultyLabels.very_easy, level: "very_easy" },
  { slug: "lako", title: difficultyLabels.easy, level: "easy" },
  { slug: "srednje", title: difficultyLabels.medium, level: "medium" },
  { slug: "tesko", title: difficultyLabels.hard, level: "hard" },
  { slug: "veoma-tesko", title: difficultyLabels.very_hard, level: "very_hard" },
  { slug: "4-akorda", title: "Do 4 akorda", level: null },
  { slug: "beginner", title: "Veoma lako i lako", level: null },
  { slug: "acoustic", title: "Osnovni otvoreni akordi", level: null },
  { slug: "domace", title: "Zabavne", level: null },
  { slug: "strane", title: "Strane", level: null },
  { slug: "narodne", title: "Narodne", level: null },
] as const
export function catalogEntry(slug: string) { return catalogEntries.find(entry => entry.slug === slug) }
export function matchesCatalog(song: MusicalSong & { category: string }, slug: string, assessment = estimateDifficulty(song)) {
  const entry = catalogEntry(slug)
  if (!entry) return false
  if (["domace", "strane", "narodne"].includes(slug)) return song.category === slug
  if (!assessment.level) return false
  if (entry.level) return assessment.level === entry.level
  if (slug === "4-akorda") return assessment.chords.length <= 4
  if (slug === "beginner") return difficultyLevels.indexOf(assessment.level) <= 1
  return assessment.chords.every(chord => ["C", "D", "E", "G", "A", "Am", "Dm", "Em"].includes(chord))
}
