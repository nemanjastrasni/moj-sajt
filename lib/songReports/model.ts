export const reportKinds = ["wrong_chord", "layout", "lyrics", "duplicate"] as const
export type ReportKind = typeof reportKinds[number]
export const reportKindLabels: Record<ReportKind, string> = { wrong_chord: "Pogresan akord", layout: "Raspored akorda", lyrics: "Tekst pesme", duplicate: "Duplikat" }
export const reportStatuses = ["pending", "resolved", "dismissed"] as const
export type ReportStatus = typeof reportStatuses[number]
export const reportStatusLabels: Record<ReportStatus, string> = { pending: "Na cekanju", resolved: "Reseno", dismissed: "Odbaceno" }
export const REPORT_PAGE_SIZE = 20
export const REPORT_DAILY_LIMIT = 10
export type ReportInput = { songId: string; kind: ReportKind; description: string; songVersion: string; transpose: number }
export class ReportError extends Error { constructor(public status: number, message: string) { super(message) } }
export const isReportKind = (value: unknown): value is ReportKind => typeof value === "string" && (reportKinds as readonly string[]).includes(value)
export const isReportStatus = (value: unknown): value is ReportStatus => typeof value === "string" && (reportStatuses as readonly string[]).includes(value)
export const reportId = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(value)
const version = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value)
function text(value: unknown, max: number, message: string) {
  if (typeof value !== "string" || value.length > max * 2 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) throw new ReportError(400, message)
  const result = value.replace(/\r\n?/g, "\n").trim()
  if ([...result].length > max) throw new ReportError(400, message)
  return result
}
export function validateReport(value: unknown): ReportInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ReportError(400, "Neispravni podaci prijave.")
  const input = value as Record<string, unknown>
  if (!reportId(input.songId) || !version(input.songVersion)) throw new ReportError(400, "Osvezi pesmu pre slanja prijave.")
  if (!isReportKind(input.kind)) throw new ReportError(400, "Izaberi vrstu greske.")
  if (!Number.isInteger(input.transpose) || Number(input.transpose) < -11 || Number(input.transpose) > 11) throw new ReportError(400, "Neispravan tonalitet prijave.")
  const description = text(input.description, 2000, "Opis greske moze imati najvise 2.000 znakova.")
  if ([...description].length < 10) throw new ReportError(400, "Opisi gresku sa najmanje 10 znakova.")
  return { songId: input.songId, songVersion: input.songVersion, kind: input.kind, description, transpose: Number(input.transpose) }
}
export function validateReportReview(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ReportError(400, "Neispravni podaci prijave.")
  const input = value as Record<string, unknown>
  if (!isReportStatus(input.status) || !version(input.version)) throw new ReportError(400, "Osvezi prijavu pre obrade.")
  const note = text(input.note, 1000, "Napomena moze imati najvise 1.000 znakova.")
  if (input.status === "dismissed" && !note) throw new ReportError(400, "Napisi razlog odbacivanja.")
  return { status: input.status, version: input.version, note }
}
export function reportFilters(query: { status?: unknown; kind?: unknown; page?: unknown }) {
  return { status: isReportStatus(query.status) ? query.status : "pending" as ReportStatus,
    kind: isReportKind(query.kind) ? query.kind : "" as ReportKind | "",
    page: typeof query.page === "string" && /^\d{1,5}$/.test(query.page) ? Math.max(1, Math.min(10000, Number(query.page))) : 1 }
}
export type ReportFilters = ReturnType<typeof reportFilters>
export type ReportView = {
  id: string; kind: ReportKind; description: string; status: ReportStatus; note: string; version: string;
  title: string; artist: string; transpose: number; createdAt: string; updatedAt: string; reporter: string | null; reporterDeleted: boolean;
  songHref: string | null; editHref: string | null; songChanged: boolean;
}
