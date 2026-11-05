import { parseSongSheet } from "../chords/songSheet"
import { biographyText } from "../biographies/catalog"
import { normalizeDiscography } from "../discography"

export type SongContentKind = "withChords" | "textOnly" | "notationOnly" | "empty"
export type SongContentCounts = Record<SongContentKind, number> & { songs: number }
export type ArtistContentCounts = { artists: number; biographies: number; discographies: number }
export type AdminStatistics = SongContentCounts & ArtistContentCounts & { users: number; calculatedAt: string }

export function emptySongCounts(): SongContentCounts {
  return { songs: 0, withChords: 0, textOnly: 0, notationOnly: 0, empty: 0 }
}

export function songContentKind(song: { lyrics: string | null; chords: string | null }): SongContentKind {
  let notation = false, text = false
  // Stop at the first chord; long chord sheets do not need a full render parse.
  for (const source of new Set([song.chords, song.lyrics])) {
    if (!source) continue
    for (const raw of source.replace(/\r\n?/g, "\n").split("\n")) {
      const line = parseSongSheet(raw)[0]
      if (!line) continue
      if (line.tokens.some(token => !token.bass)) return "withChords"
      if (line.kind === "tab" || line.tokens.length) notation = true
      if (line.text.replace(/[\u200b-\u200d\ufeff]/g, "").trim()) text = true
    }
  }
  return notation ? "notationOnly" : text ? "textOnly" : "empty"
}

export function addSongCounts(counts: SongContentCounts, songs: { lyrics: string | null; chords: string | null }[]) {
  for (const song of songs) {
    counts.songs++
    counts[songContentKind(song)]++
  }
}

export function addArtistCounts(counts: ArtistContentCounts, artists: { bio: string | null; bioShort: string | null; discography: unknown }[]) {
  for (const artist of artists) {
    counts.artists++
    if (biographyText(artist.bio) || biographyText(artist.bioShort)) counts.biographies++
    if (normalizeDiscography(artist.discography).length) counts.discographies++
  }
}
