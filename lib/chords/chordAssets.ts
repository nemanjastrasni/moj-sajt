import { chordImages } from "./chordImages"
import { parseChordSymbol } from "./chordSymbols"
import { chordRendererFactory } from "chord-symbol/lib/chord-symbol.js"

const sharpNotes: Record<string, string> = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" }
const flatNotes: Record<string, string> = { "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb" }
const imageNames = new Map(Object.keys(chordImages).map((name) => [name.toLowerCase(), name]))

function directAssetName(symbol: string) {
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

const renderFull = chordRendererFactory({ simplify: "none", useShortNamings: false, notationSystem: "english" })
const renderShort = chordRendererFactory({ simplify: "none", useShortNamings: true, notationSystem: "english" })

export function getChordAssetName(symbol: string) {
  const direct = directAssetName(symbol)
  if (direct) return direct
  const chord = parseChordSymbol(symbol)
  if (!chord) return null
  // Normalize only the lookup. The author's chord label and transposition stay intact.
  for (let candidate of [renderFull(chord), renderShort(chord)]) {
    // A suspension replaces the third; a redundant minor marker adds no minor third.
    if (chord.normalized.isSuspended && !chord.normalized.semitones.some(interval => interval === 3 || interval === 4)) {
      candidate = candidate.replace(/^([A-G][#b]?)m(?=sus)/, "$1")
    }
    const asset = directAssetName(candidate)
    if (!asset) continue
    const actual = parseChordSymbol(asset.replace("_", "/"))
    const pitch = (note: string) => sharpNotes[note] ?? note
    if (actual && pitch(actual.normalized.rootNote) === pitch(chord.normalized.rootNote) &&
      pitch(actual.normalized.bassNote ?? "") === pitch(chord.normalized.bassNote ?? "") &&
      actual.normalized.semitones.join(",") === chord.normalized.semitones.join(",")) return asset
  }
  return null
}

export function getChordAssetUrl(name: string, variant = 1) {
  const directory = variant === 1 ? "chords_final" : "chord_variants_final"
  return `/${directory}/${encodeURIComponent(name)}_v${variant}.png`
}
