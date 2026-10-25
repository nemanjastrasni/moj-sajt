import { SubmissionError } from "../submissions/validation"

export function playlistId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(value)) throw new SubmissionError(400, "Neispravna playlista ili pesma.")
  return value
}
export function playlistName(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 120 || /[\u0000-\u001f\u007f]/.test(value)) throw new SubmissionError(400, "Naziv playliste mora imati od 1 do 120 znakova.")
  return value.trim()
}
export function playlistCategory(value: unknown): string {
  const name = typeof value === "string" ? value.toLowerCase() : "mix"
  if (name.includes("dom") || name.includes("zab")) return "domace"
  if (name.includes("str")) return "strane"
  if (name.includes("nar")) return "narodne"
  return "mix"
}
export function playlistUpdate(body: Record<string, unknown>) {
  const data: { name?: string; isPublic?: boolean } = {}
  if ("name" in body) data.name = playlistName(body.name)
  if ("isPublic" in body) {
    if (typeof body.isPublic !== "boolean") throw new SubmissionError(400, "Proveri privatnost playliste.")
    data.isPublic = body.isPublic
  }
  if (!Object.keys(data).length) throw new SubmissionError(400, "Neispravni podaci.")
  return data
}
export function playlistReorder(value: unknown): { id: string; order: number }[] {
  if (!Array.isArray(value) || value.length > 2000) throw new SubmissionError(400, "Proveri redosled pesama.")
  const ids = new Set<string>()
  return value.map((entry, index) => {
    const id = playlistId(entry?.id)
    if (ids.has(id) || entry.order !== index) throw new SubmissionError(400, "Proveri redosled pesama.")
    ids.add(id)
    return { id, order: index }
  })
}
export function playlistExpectedOrder(value: unknown): { id: string; order: number | null }[] {
  if (!Array.isArray(value) || value.length > 2000) throw new SubmissionError(409, "Playlista je izmenjena. Osvezi je pre promene redosleda.")
  const ids = new Set<string>()
  return value.map(entry => {
    const id = playlistId(entry?.id), order = entry?.order
    if (ids.has(id) || (order !== null && (!Number.isSafeInteger(order) || order < 0))) throw new SubmissionError(400, "Proveri redosled pesama.")
    ids.add(id)
    return { id, order }
  })
}
