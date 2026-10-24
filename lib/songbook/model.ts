export const MAX_BOOK_SONGS = 100
export const MAX_PDF_CHARACTERS = 1500000
export type BookEntry = { id: string; transpose: number }
export type BookDraft = { version: 1; title: string; fontSize: number; contents: boolean; songs: BookEntry[] }
export type PdfSong = BookEntry & { title: string; artist: string; lyrics: string }
export const emptyBook = (): BookDraft => ({ version: 1, title: "", fontSize: 11, contents: true, songs: [] })
export const normalizeTranspose = (value: number) => Number.isFinite(value) ? Math.trunc(value) % 12 || 0 : 0

export function validateBookEntries(value: unknown): BookEntry[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_BOOK_SONGS) throw new Error("Izaberi od 1 do 100 pesama.")
  const seen = new Set<string>()
  return value.map(entry => {
    if (!entry || typeof entry !== "object" || typeof entry.id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(entry.id) || seen.has(entry.id) || !Number.isInteger(entry.transpose) || entry.transpose < -11 || entry.transpose > 11) throw new Error("Proveri izbor pesama i tonalitete.")
    seen.add(entry.id)
    return { id: entry.id, transpose: entry.transpose }
  })
}

export function restoreBookDraft(raw: string | null, available: ReadonlySet<string>): BookDraft {
  const result = emptyBook()
  try {
    if (!raw || raw.length > 30000) return result
    const value = JSON.parse(raw)
    if (value?.version !== 1 || !Array.isArray(value.songs)) return result
    result.title = typeof value.title === "string" ? value.title.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 120) : ""
    result.fontSize = Number.isInteger(value.fontSize) && value.fontSize >= 8 && value.fontSize <= 16 ? value.fontSize : 11
    result.contents = typeof value.contents === "boolean" ? value.contents : true
    const seen = new Set<string>()
    for (const entry of value.songs.slice(0, MAX_BOOK_SONGS)) {
      if (!entry || typeof entry.id !== "string" || !available.has(entry.id) || seen.has(entry.id)) continue
      seen.add(entry.id)
      result.songs.push({ id: entry.id, transpose: normalizeTranspose(Number(entry.transpose)) })
    }
  } catch {}
  return result
}

export function moveBookEntry(songs: BookEntry[], id: string, direction: -1 | 1): BookEntry[] {
  const index = songs.findIndex(song => song.id === id), target = index + direction
  if (index < 0 || target < 0 || target >= songs.length) return songs
  const result = songs.slice()
  ;[result[index], result[target]] = [result[target], result[index]]
  return result
}
