import { chordImages } from "./chordImages"
import { parseChordSymbol } from "./chordSymbols"

const sharpNotes: Record<string, string> = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" }
const flatNotes: Record<string, string> = { "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb" }
const imageNames = new Map(Object.keys(chordImages).map((name) => [name.toLowerCase(), name]))

export function getChordAssetName(symbol: string) {
  const chord = parseChordSymbol(symbol)
  if (!chord) return null
  const root = sharpNotes[chord.normalized.rootNote] ?? chord.normalized.rootNote
  const suffix = (chord.input.descriptor ?? "")
    .replace(/^M(?=\d)/, "maj")
    .replace(/^min/i, "m")
    .replace(/^\+/, "aug")
    .replace(/\(([^()]*)\)/g, "$1")
  const bassNote = sharpNotes[chord.normalized.bassNote] ?? chord.normalized.bassNote
  const bass = chord.input.bassNote ? "_" + bassNote.toLowerCase() : ""
  const name = root + (suffix || (!bass ? "maj" : "")) + bass
  const alternateBass = flatNotes[bassNote]
  const assetName = imageNames.get(name.toLowerCase()) ??
    (alternateBass ? imageNames.get((root + suffix + "_" + alternateBass).toLowerCase()) : undefined)
  if (!assetName) return null
  const assetChord = parseChordSymbol(assetName.replace("_", "/"))
  if (!assetChord) return null
  const pitch = (note: string) => sharpNotes[note] ?? note
  // F(#9) is not F#9. A filename must describe the same chord, not just similar text.
  if (pitch(assetChord.normalized.rootNote) !== pitch(chord.normalized.rootNote) ||
    pitch(assetChord.normalized.bassNote ?? "") !== pitch(chord.normalized.bassNote ?? "") ||
    assetChord.normalized.semitones.join(",") !== chord.normalized.semitones.join(",")) return null
  return assetName
}

export function getChordAssetUrl(name: string, variant = 1) {
  const directory = variant === 1 ? "chords_final" : "chord_variants_final"
  return `/${directory}/${encodeURIComponent(name)}_v${variant}.png`
}
