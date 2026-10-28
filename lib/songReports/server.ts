import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { submissionUser } from "@/lib/submissions/server"
import { SubmissionError } from "@/lib/submissions/validation"
import { readLimitedJson, RequestBodyError } from "@/lib/auth/request"
import { songReviewVersion } from "@/lib/songReview/server"
import { songPageHref } from "@/lib/adminContent/paths"
import { ReportError, REPORT_DAILY_LIMIT, REPORT_PAGE_SIZE, isReportKind, isReportStatus, reportId, type ReportInput, type ReportFilters, type ReportView, type validateReportReview } from "./model"

export const reportUser = (admin = false) => submissionUser(admin)
export async function reportBody(request: Request) {
  const origin = request.headers.get("origin")
  if (origin && origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") throw new ReportError(403, "Nije dozvoljeno.")
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ReportError(415, "Ocekuju se JSON podaci.")
  try { return await readLimitedJson(request, 16000) }
  catch (cause) { if (cause instanceof RequestBodyError) throw new ReportError(cause.status, "Neispravni ili preveliki podaci prijave."); throw cause }
}
export function reportFailure(error: unknown) {
  if (error instanceof ReportError || error instanceof SubmissionError) return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } })
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "Prijava vec postoji na cekanju. Osvezi prikaz." }, { status: 409, headers: { "Cache-Control": "no-store" } })
  return NextResponse.json({ error: "Prijave trenutno nisu dostupne. Pokusaj kasnije." }, { status: 503, headers: { "Cache-Control": "no-store" } })
}
async function transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 }) }
    catch (error) { if (attempt < 2 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") continue; throw error }
  }
}
async function activeUser(tx: Prisma.TransactionClient, id: string, admin = false) {
  const user = await tx.user.findUnique({ where: { id }, select: { id: true, role: true, banned: true } })
  if (!user || user.banned || admin && user.role !== "admin") throw new ReportError(403, "Nije dozvoljeno.")
}
export async function createSongReport(actorId: string, input: ReportInput) {
  return transaction(async tx => {
    await activeUser(tx, actorId)
    const recent = await tx.songReport.count({ where: { userId: actorId, createdAt: { gte: new Date(Date.now() - 86400000) } } })
    if (recent >= REPORT_DAILY_LIMIT) throw new ReportError(429, "Mozes poslati najvise 10 prijava za 24 sata.")
    const song = await tx.song.findUnique({ where: { id: input.songId }, select: { id: true, title: true, lyrics: true, chords: true, artist: { select: { name: true } } } })
    if (!song) throw new ReportError(404, "Pesma nije pronadjena.")
    if (songReviewVersion(song) !== input.songVersion) throw new ReportError(409, "Pesma je izmenjena. Osvezi stranicu pre prijave.")
    const duplicate = await tx.songReport.findFirst({ where: { userId: actorId, songId: song.id, kind: input.kind, status: "pending" } })
    if (duplicate) throw new ReportError(409, "Vec imas prijavu ove greske na cekanju.")
    return tx.songReport.create({ data: { songId: song.id, userId: actorId, kind: input.kind, description: input.description, songVersion: input.songVersion, transpose: input.transpose, songTitle: song.title, artistName: song.artist.name }, select: { id: true, status: true } })
  })
}
export function reportVersion(report: { id: string; status: string; reviewNote: string | null; reviewerId: string | null; updatedAt: Date }) {
  return createHash("sha256").update(JSON.stringify([report.id, report.status, report.reviewNote, report.reviewerId, report.updatedAt.toISOString()])).digest("hex")
}
export async function reviewSongReport(id: string, actorId: string, input: ReturnType<typeof validateReportReview>) {
  if (!reportId(id)) throw new ReportError(400, "Neispravni podaci prijave.")
  return transaction(async tx => {
    await activeUser(tx, actorId, true)
    const before = await tx.songReport.findUnique({ where: { id } })
    if (!before) throw new ReportError(404, "Prijava nije pronadjena.")
    if (reportVersion(before) !== input.version) throw new ReportError(409, "Prijavu je promenio drugi administrator. Osvezi prikaz.")
    const now = new Date()
    const changed = await tx.songReport.updateMany({ where: { id, updatedAt: before.updatedAt, status: before.status }, data: { status: input.status, reviewNote: input.note || null, reviewerId: actorId, updatedAt: now, reviewedAt: input.status === "pending" ? null : now } })
    if (changed.count !== 1) throw new ReportError(409, "Prijavu je promenio drugi administrator. Osvezi prikaz.")
    return { id, status: input.status }
  })
}
export async function listSongReports(filters: ReportFilters) {
  await reportUser(true)
  const where = { status: filters.status, ...(filters.kind ? { kind: filters.kind } : {}) }
  const total = await prisma.songReport.count({ where }), totalPages = Math.max(1, Math.ceil(total / REPORT_PAGE_SIZE)), page = Math.min(filters.page, totalPages)
  const rows = await prisma.songReport.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * REPORT_PAGE_SIZE, take: REPORT_PAGE_SIZE,
    select: { id: true, kind: true, description: true, status: true, reviewNote: true, reviewerId: true, transpose: true, songTitle: true, artistName: true, songVersion: true, createdAt: true, updatedAt: true,
      user: { select: { name: true } }, song: { select: { id: true, title: true, slug: true, category: true, lyrics: true, chords: true, artist: { select: { slug: true, category: true } } } } },
  })
  const items: ReportView[] = rows.map(row => {
    if (!isReportKind(row.kind) || !isReportStatus(row.status)) throw new ReportError(503, "Prijave trenutno nisu dostupne. Pokusaj kasnije.")
    return { id: row.id, kind: row.kind, description: row.description, status: row.status, note: row.reviewNote ?? "", version: reportVersion(row), title: row.songTitle, artist: row.artistName, transpose: row.transpose,
      createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), reporter: row.user?.name || null, reporterDeleted: !row.user,
      songHref: row.song ? songPageHref(row.song, row.song.artist) : null, editHref: row.song ? `/admin/songs/${encodeURIComponent(row.song.id)}/edit?from=song` : null,
      songChanged: Boolean(row.song && songReviewVersion(row.song) !== row.songVersion) }
  })
  return { items, total, totalPages, page }
}
export function refreshSongReports() { try { revalidatePath("/admin/prijave") } catch {} }
