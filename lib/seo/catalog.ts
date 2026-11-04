export const CHORD_ROOTS = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"] as const

// Page parameters can retain encoded characters in this Next.js version.
// Decode once, accepting decoded inputs too, and reject malformed escapes.
export function decodeCatalogSegment(value: string): string | null {
  try { return decodeURIComponent(value) }
  catch { return null }
}

export function catalogLetter(value: string, kind: "songs" | "biographies" = "songs") {
  const input = decodeCatalogSegment(value)
  if (input === null) return null
  const label = input.toUpperCase()
  if (label === "NUM" || label === "#") return { label: "#", slug: "num", input }
  if (!/^[A-ZČĆŽŠĐ]$/.test(label) && !(kind === "songs" && ["DŽ", "LJ", "NJ"].includes(label))) return null
  return { label, slug: label.toLowerCase(), input }
}

export function chordRoot(value: string): string | null {
  const normalized = decodeCatalogSegment(value)?.toUpperCase()
  if (!normalized) return null
  return (CHORD_ROOTS as readonly string[]).includes(normalized) ? normalized : null
}
