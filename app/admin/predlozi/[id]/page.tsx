import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { submissionUser } from "@/lib/submissions/server"
import SongSubmissionForm from "@/app/components/SongSubmissionForm"
import { submissionStatus } from "@/app/components/SongSubmissionList"

export const dynamic = "force-dynamic"
export default async function ReviewSongPage({ params }: { params: Promise<{ id: string }> }) {
  await submissionUser(true).catch(() => redirect("/login"))
  const { id } = await params
  let proposal
  try {
    proposal = await prisma.songSubmission.findUnique({ where: { id }, include: { user: { select: { name: true, email: true } } } })
  } catch { return <p role="alert" className="text-red-700">Predlog trenutno nije dostupan. Proveri bazu i pokusaj ponovo.</p> }
  if (!proposal) notFound()
  return <section className="admin-page">
    <Link href="/admin/predlozi" className="text-sky-400 underline">Svi predlozi</Link>
    <h1 className="my-5 break-words text-2xl font-bold">Pregled predloga</h1>
    <p className="mb-6 break-words text-sm text-gray-400">Poslao: {proposal.user.name || proposal.user.email} · {submissionStatus[proposal.status]}</p>
    {proposal.status === "pending" ? <SongSubmissionForm reviewId={proposal.id} initial={{ category: proposal.category, artistName: proposal.artistName, title: proposal.title, lyrics: proposal.lyrics }} /> : <>
      <h2 className="break-words text-xl">{proposal.artistName} - {proposal.title}</h2>
      {proposal.reviewNote && <p className="my-4 whitespace-pre-wrap break-words">Napomena: {proposal.reviewNote}</p>}
      <pre className="mt-6 max-w-full overflow-x-auto whitespace-pre font-mono text-sm">{proposal.lyrics}</pre>
    </>}
  </section>
}
