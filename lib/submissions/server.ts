import { getServerSession } from "next-auth"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { readLimitedJson, RequestBodyError } from "@/lib/auth/request"
import { slugify } from "@/lib/until/slug"
import { SubmissionError, type SubmissionInput, validateReview } from "./validation"

export async function submissionUser(admin = false) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new SubmissionError(401, "Prijavi se da nastavis.")
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, banned: true, role: true } })
  if (!user || user.banned || (admin && user.role !== "admin")) throw new SubmissionError(403, "Nije dozvoljeno.")
  return user
}

export async function submissionBody(request: Request) {
  const origin = request.headers.get("origin")
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") throw new SubmissionError(403, "Nije dozvoljeno.")
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new SubmissionError(415, "Ocekuju se JSON podaci.")
  try { return await readLimitedJson(request, 200000) }
  catch (error) {
    if (error instanceof RequestBodyError) throw new SubmissionError(error.status, error.status === 413 ? "Predlog je prevelik." : "Neispravni podaci.")
    throw error
  }
}

export function submissionFailure(error: unknown) {
  if (error instanceof SubmissionError) return NextResponse.json({ error: error.message }, { status: error.status })
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "Pesma ili izvodjac sa istom oznakom vec postoji. Proveri predlog." }, { status: 409 })
  return NextResponse.json({ error: "Baza trenutno nije dostupna. Pokusaj ponovo kasnije." }, { status: 503 })
}

async function transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }) }
    catch (error) {
      if (attempt < 2 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") continue
      throw error
    }
  }
}

export async function createSubmission(userId: string, input: SubmissionInput) {
  return transaction(async tx => {
    // Serializable isolation keeps simultaneous requests from bypassing the per-user limit.
    const recent = await tx.songSubmission.count({ where: { userId, createdAt: { gte: new Date(Date.now() - 86400000) } } })
    if (recent >= 5) throw new SubmissionError(429, "Mozes poslati najvise 5 predloga za 24 sata.")
    const duplicate = await tx.songSubmission.findFirst({ where: { userId, status: "pending", artistName: input.artistName, title: input.title } })
    if (duplicate) throw new SubmissionError(409, "Vec imas ovu pesmu na cekanju.")
    return tx.songSubmission.create({ data: { ...input, userId }, select: { id: true } })
  })
}

export async function reviewSubmission(id: string, reviewerId: string, review: ReturnType<typeof validateReview>) {
  return transaction(async tx => {
    const proposal = await tx.songSubmission.findUnique({ where: { id } })
    if (!proposal) throw new SubmissionError(404, "Predlog nije pronadjen.")
    if (proposal.status !== "pending") throw new SubmissionError(409, "Ovaj predlog je vec obradjen.")
    let publishedSongId: string | null = null
    let href: string | null = null
    if (review.action === "approve" && review.input) {
      const input = review.input
      const artistSlug = slugify(input.artistName)
      // Existing artists are reused, never renamed or moved to another category.
      let artist = await tx.artist.findFirst({ where: { OR: [{ slug: artistSlug }, { name: input.artistName }] } })
      if (artist && artist.category !== input.category) throw new SubmissionError(409, "Izvodjac vec postoji u drugoj kategoriji. Uskladi kategoriju pre odobravanja.")
      if (!artist) artist = await tx.artist.create({ data: { name: input.artistName, slug: artistSlug, category: input.category } })
      const slug = slugify(input.title)
      const exists = await tx.song.findFirst({ where: { artistId: artist.id, OR: [{ slug }, { title: input.title }] } })
      if (exists) throw new SubmissionError(409, "Ova pesma vec postoji kod izvodjaca. Proveri duplikat pre objave.")
      const song = await tx.song.create({ data: { title: input.title, slug, category: input.category, lyrics: input.lyrics, artistId: artist.id } })
      publishedSongId = song.id
      href = "/pesme/" + [input.category, artist.slug, song.slug].map(encodeURIComponent).join("/")
    }
    await tx.songSubmission.update({ where: { id }, data: {
      ...(review.input ?? {}), status: review.action === "approve" ? "approved" : "rejected",
      reviewNote: review.reviewNote || null, reviewerId, reviewedAt: new Date(), publishedSongId,
    } })
    return { href }
  })
}
