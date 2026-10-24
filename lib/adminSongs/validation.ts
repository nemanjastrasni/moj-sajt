import { SubmissionError, submissionCategories } from "../submissions/validation"

export const MAX_BATCH = 20
export type SongDraft = { title: string; lyrics: string; chords: string }
export type ArtistChoice = { artistId?: string; artistName: string; category: string }
export type SongBatch = ArtistChoice & { songs: SongDraft[]; artistBio: string; artistDiscography: string }

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SubmissionError(400, "Neispravni podaci.")
  return value as Record<string, unknown>
}
function text(value: unknown, max: number, label: string, optional = false) {
  if (value == null && optional) return ""
  if (typeof value !== "string" || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) throw new SubmissionError(400, `Proveri polje: ${label}.`)
  return value.replace(/\r\n?/g, "\n")
}
export function adminSongId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(value)) throw new SubmissionError(400, "Neispravna oznaka pesme ili izvodjaca.")
  return value
}
function choice(data: Record<string, unknown>): ArtistChoice {
  if (!submissionCategories.some(item => item.value === data.category)) throw new SubmissionError(400, "Izaberi kategoriju.")
  const artistName = text(data.artistName, 200, "izvodjac / grupa").trim().replace(/\s+/g, " ")
  if (!artistName || /[\r\n\t]/.test(String(data.artistName))) throw new SubmissionError(400, "Unesi naziv izvodjaca.")
  return { artistName, category: String(data.category), ...(data.artistId ? { artistId: adminSongId(data.artistId) } : {}) }
}
function draft(value: unknown): SongDraft {
  const data = record(value)
  const title = text(data.title, 200, "naziv pesme").trim().replace(/\s+/g, " ")
  if (!title || /[\r\n\t]/.test(String(data.title))) throw new SubmissionError(400, "Unesi naziv pesme.")
  const lyrics = text(data.lyrics, 100000, "tekst pesme")
  if (!lyrics.trim()) throw new SubmissionError(400, "Unesi tekst pesme.")
  return { title, lyrics, chords: text(data.chords, 100000, "akordi", true) }
}
export function validateSongBatch(value: unknown): SongBatch {
  const data = record(value)
  if (!Array.isArray(data.songs) || data.songs.length < 1 || data.songs.length > MAX_BATCH) throw new SubmissionError(400, `Unesi od 1 do ${MAX_BATCH} pesama.`)
  const songs = data.songs.map(draft)
  if (new Set(songs.map(song => song.title.normalize("NFC").toLowerCase())).size !== songs.length) throw new SubmissionError(409, "Isti naslov je unet vise puta.")
  return { ...choice(data), songs, artistBio: text(data.artistBio, 30000, "biografija", true), artistDiscography: text(data.artistDiscography, 100000, "diskografija", true) }
}
export function validateSongEdit(value: unknown) {
  const data = record(value)
  return { ...choice(data), ...draft(data) }
}
export function validateSongDelete(value: unknown): string {
  const data = record(value)
  const title = text(data.title, 200, "potvrda brisanja")
  if (!title) throw new SubmissionError(400, "Potvrdi koju pesmu brises.")
  return title
}
