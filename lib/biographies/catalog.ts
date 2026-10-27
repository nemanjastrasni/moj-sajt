import { normalizeDiscography } from "../discography"

type BiographyContent = { bio?: string | null; bioShort?: string | null; discography?: unknown }
export type BiographyArtist = { id: string; name: string; slug: string; category: string | null; image: string | null }
const alphabet = /^[A-Z\u010c\u0106\u0160\u0110\u017d]/

export function biographyText(value: unknown): string {
  if (typeof value !== "string") return ""
  const text = value.replace(/[\u200b-\u200d\ufeff]/g, "").trim()
  if (/^(?:biografija (?:jo[s\u0161] )?nije dostupna|biography (?:is )?not available(?: yet)?)[.!]?$/i.test(text)) return ""
  return text
}

export function hasBiographyContent(artist: BiographyContent): boolean {
  return Boolean(biographyText(artist.bio) || biographyText(artist.bioShort) || normalizeDiscography(artist.discography).length)
}

export function biographyLetter(name: string): string {
  const first = name.trim().toUpperCase()[0] || ""
  return alphabet.test(first) ? first : "#"
}

export function biographyLetters(artists: Pick<BiographyArtist, "name">[]): string[] {
  return [...new Set(artists.map(artist => biographyLetter(artist.name)))].sort((a, b) => {
    if (a === b) return 0
    if (a === "#") return -1
    if (b === "#") return 1
    return a.localeCompare(b, "sr-Latn")
  })
}

export function artistsForBiographyLetter<T extends Pick<BiographyArtist, "name">>(artists: T[], letter: string): T[] {
  const normalized = ["NUM", "#"].includes(letter.toUpperCase()) ? "#" : letter.toUpperCase()
  return artists.filter(artist => biographyLetter(artist.name) === normalized)
}
