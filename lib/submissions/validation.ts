import { parseSongSheet } from "../chords/songSheet"
import { slugify } from "../until/slug"

export const submissionCategories = [
  { value: "domace", label: "Zabavne" },
  { value: "narodne", label: "Narodne" },
  { value: "strane", label: "Strane" },
] as const
export const submissionExample = "[Strofa 1]\nG               D\nOvde ide prvi stih pesme\nEm              C\nOvde ide drugi stih\n\n[Refren]\nC       D       G\nOvde ide tekst refrena"
export type SubmissionInput = { category: string; artistName: string; title: string; lyrics: string }

export class SubmissionError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export function validateSubmission(value: unknown): SubmissionInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SubmissionError(400, "Neispravni podaci.")
  const input = value as Record<string, unknown>
  function name(key: string, label: string) {
    const raw = input[key]
    if (typeof raw !== "string" || raw.length > 200 || /[\u0000-\u001f\u007f]/.test(raw)) throw new SubmissionError(400, `Proveri polje: ${label}.`)
    const text = raw.normalize("NFC").trim().replace(/\s+/g, " ")
    if (text.length < 2 || !slugify(text)) throw new SubmissionError(400, `Proveri polje: ${label}.`)
    return text
  }
  if (!submissionCategories.some(item => item.value === input.category)) throw new SubmissionError(400, "Izaberi kategoriju.")
  const artistName = name("artistName", "izvodjac / grupa")
  const title = name("title", "naziv pesme")
  if (typeof input.lyrics !== "string" || input.lyrics.length > 40000) throw new SubmissionError(400, "Tekst moze imati najvise 40.000 znakova.")
  const lyrics = input.lyrics.replace(/\r\n?/g, "\n").trimEnd().replace(/^\n+/, "")
  if (lyrics.trim().length < 20 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(lyrics)) throw new SubmissionError(400, "Unesi citljiv tekst pesme sa akordima.")
  if (lyrics.split("\n").some(line => line.length > 500)) throw new SubmissionError(400, "Jedan red moze imati najvise 500 znakova.")
  if (/https?:\/\/|www\.|<\/?[a-z][^>]*>/i.test(lyrics)) throw new SubmissionError(400, "Unesi samo tekst i akorde, bez linkova i HTML oznaka.")
  const lines = parseSongSheet(lyrics)
  if (!lines.some(line => line.tokens.some(token => !token.bass))) throw new SubmissionError(400, "Akorde upisi u poseban red iznad stiha, kao u primeru.")
  if (!lines.some(line => (line.kind === "lyrics" || line.kind === "inline") && /[a-z\u00c0-\u024f\u0400-\u04ff]{2}/i.test(line.text) && !/^\s*\[.*\]\s*$/.test(line.text))) throw new SubmissionError(400, "Pored akorda unesi i tekst pesme.")
  return { category: input.category as string, artistName, title, lyrics }
}

export function validateReview(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SubmissionError(400, "Neispravni podaci.")
  const data = value as Record<string, unknown>
  if (data.action !== "approve" && data.action !== "reject") throw new SubmissionError(400, "Nepoznata odluka.")
  if (typeof data.reviewNote !== "string" || data.reviewNote.length > 1000) throw new SubmissionError(400, "Napomena moze imati najvise 1.000 znakova.")
  const reviewNote = data.reviewNote.trim()
  if (data.action === "reject" && !reviewNote) throw new SubmissionError(400, "Napisi razlog odbijanja.")
  return { action: data.action, reviewNote, input: data.action === "approve" ? validateSubmission(data) : null }
}
