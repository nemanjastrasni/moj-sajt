import { submissionCategories, SubmissionError } from "../submissions/validation"
import { safeArtistImage } from "../artistMedia"

export function contentRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SubmissionError(400, "Neispravni podaci.")
  return value as Record<string, unknown>
}
function text(value: unknown, max: number, field: string) {
  if (typeof value !== "string" || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) throw new SubmissionError(400, `Proveri polje: ${field}.`)
  return value.replace(/\r\n?/g, "\n")
}
export function contentVersion(value: unknown) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw new SubmissionError(400, "Osvezi stranicu pre izmene.")
  return value
}
export function parseArtistDiscography(value: unknown) {
  const raw = text(value, 100000, "diskografija").trim()
  if (!raw) return []
  let rows: unknown
  if (/^[\[{]/.test(raw)) {
    try { rows = JSON.parse(raw) } catch { throw new SubmissionError(400, "Diskografija nije ispravan JSON. Proveri zagrade i navodnike.") }
  } else rows = raw.split("\n").map(line => line.trim()).filter(Boolean)
  if (!Array.isArray(rows) || rows.length > 500 || rows.some(row => {
    if (typeof row === "string") return !row.trim() || row.length > 1000
    if (!row || typeof row !== "object" || Array.isArray(row)) return true
    const album = row as Record<string, unknown>
    return typeof album.title !== "string" || !album.title.trim() || album.title.length > 1000 || (album.year != null && album.year !== "" && (!["string", "number"].includes(typeof album.year) || !/^(?:18|19|20)\d{2}$/.test(String(album.year)))) || (album.kind != null && (typeof album.kind !== "string" || !["studio", "live", "compilation", "album"].includes(album.kind)))
  })) throw new SubmissionError(400, "Unesi albume po redovima ili JSON niz albuma sa nazivom i godinom.")
  return rows as (string | { title: string; year?: string | number; kind?: string })[]
}
export function validateArtistEdit(value: unknown) {
  const data = contentRecord(value), name = text(data.name, 200, "ime izvodjaca").trim()
  if (!name || /[\r\n\t]/.test(name)) throw new SubmissionError(400, "Unesi naziv izvodjaca.")
  if (!submissionCategories.some(category => category.value === data.category)) throw new SubmissionError(400, "Izaberi kategoriju.")
  const image = text(data.image, 2000, "slika").trim()
  if (image && !safeArtistImage(image)) throw new SubmissionError(400, "Slika mora biti lokalna putanja ili HTTPS URL.")
  return { name, category: String(data.category), image: image || null, bio: text(data.bio, 100000, "biografija"), discography: parseArtistDiscography(data.discography), version: contentVersion(data.version) }
}
export function validateBioDelete(value: unknown) {
  const data = contentRecord(value)
  const name = text(data.name, 200, "potvrda brisanja")
  if (!name.trim()) throw new SubmissionError(400, "Potvrdi ime izvodjaca.")
  return { name, version: contentVersion(data.version) }
}
export function validateUserRole(value: unknown) {
  const data = contentRecord(value)
  if ((data.role !== "admin" && data.role !== "user") || (data.expectedRole !== "admin" && data.expectedRole !== "user") || data.confirmed !== true) throw new SubmissionError(400, "Potvrdi promenu korisnicke uloge.")
  return { role: data.role as "admin" | "user", expectedRole: data.expectedRole as "admin" | "user" }
}
