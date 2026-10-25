import { getUsedChords, parseSongSheet } from "../chords/songSheet"
import { parseChordSymbol } from "../chords/chordSymbols"

export const difficultyLevels = ["very_easy", "easy", "medium", "hard", "very_hard"] as const
export type Difficulty = typeof difficultyLevels[number]
export const difficultyLabels: Record<Difficulty, string> = {
  very_easy: "Veoma lako", easy: "Lako", medium: "Srednje", hard: "Te\u0161ko", very_hard: "Veoma te\u0161ko",
}
export const difficultyExplanation = "Automatska procena prema akordima; ritam, tempo i solo nisu ocenjeni."
export type MusicalSong = { lyrics?: string | null; chords?: string | null; content?: string | null }
const basicOpen = new Set(["C", "D", "E", "G", "A", "Am", "Dm", "Em"])
const otherOpen = new Set(["A7", "B7", "C7", "D7", "E7", "G7", "Am7", "Dm7", "Em7", "Cmaj7", "Dmaj7", "Amaj7", "Dsus2", "Dsus4", "Asus2", "Asus4", "Esus4", "Cadd9"])
function chordIdentity(symbol: string) {
  const n = parseChordSymbol(symbol)!.normalized
  return JSON.stringify([n.rootNote, [...n.semitones].sort((a, b) => a - b), n.bassNote ?? ""])
}
const basicShapes = new Set([...basicOpen].map(chordIdentity))
const otherShapes = new Set([...otherOpen].map(chordIdentity))

export function songChords(song: MusicalSong) {
  const primary = getUsedChords(parseSongSheet(song.lyrics || song.content || ""))
  const symbols = primary.length ? primary : getUsedChords(parseSongSheet(song.chords || ""))
  const unique = new Map<string, string>()
  for (const symbol of symbols) {
    const chord = parseChordSymbol(symbol)
    if (!chord) continue
    const identity = chordIdentity(symbol)
    if (!unique.has(identity)) unique.set(identity, symbol)
  }
  return [...unique.values()]
}

export function estimateDifficulty(song: MusicalSong): { level: Difficulty | null; chords: string[] } {
  const chords = songChords(song)
  if (!chords.length) return { level: null, chords }
  let grade = chords.length <= 3 ? 1 : chords.length <= 5 ? 2 : chords.length <= 8 ? 3 : chords.length <= 11 ? 4 : 5
  let demanding = 0
  for (const symbol of chords) {
    const parsed = parseChordSymbol(symbol)!
    const normalized = parsed.normalized
    const shape = normalized.rootNote + (parsed.input.descriptor ?? "")
    const identity = chordIdentity(symbol)
    let chordGrade = basicShapes.has(identity) ? 1 : otherShapes.has(identity) ? 2 : 3
    if (normalized.bassNote || /dim|aug|\u00b0|\u00f8/i.test(shape) || normalized.semitones.length >= 5) chordGrade = Math.max(chordGrade, 4)
    if (/[#b](?:5|9|11|13)|(?:11|13)/.test(parsed.input.descriptor ?? "")) chordGrade = 5
    if (chordGrade >= 4) demanding++
    grade = Math.max(grade, chordGrade)
  }
  if (demanding >= 4) grade = 5
  return { level: difficultyLevels[grade - 1], chords }
}

export function playableLevel(skill: string | null | undefined) {
  return skill === "advanced" ? 4 : skill === "intermediate" ? 2 : 1
}
