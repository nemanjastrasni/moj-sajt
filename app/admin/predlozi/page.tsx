import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { submissionUser } from "@/lib/submissions/server"
import SongSubmissionList, { submissionStatus } from "@/app/components/SongSubmissionList"

export const dynamic = "force-dynamic"
export default async function AdminSubmissionsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await submissionUser(true).catch(() => redirect("/login"))
  const query = await searchParams
  const status = ["pending", "approved", "rejected"].includes(query.status ?? "") ? query.status! : "pending"
  const page = Math.max(1, Math.min(10000, Number.parseInt(query.page ?? "1", 10) || 1))
  let items
  try {
    items = await prisma.songSubmission.findMany({ where: { status }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 20, take: 21,
      select: { id: true, title: true, artistName: true, category: true, status: true, createdAt: true, reviewNote: true,
        publishedSong: { select: { slug: true, artist: { select: { slug: true, category: true } } } } },
    })
  } catch { return <div role="alert" className="text-red-700">Predlozi nisu dostupni. Proveri bazu i da li je pokrenut SQL za SongSubmission.</div> }
  return <section className="min-w-0 bg-[#111] p-4 text-white sm:p-6">
    <h1 className="mb-5 text-2xl font-bold">Predlozi pesama</h1>
    <nav aria-label="Status predloga" className="mb-4 flex flex-wrap gap-4 border-b border-gray-700">
      {Object.entries(submissionStatus).map(([value, label]) => <Link key={value} href={`?status=${value}`} aria-current={status === value ? "page" : undefined} className={`border-b-2 py-3 ${status === value ? "border-sky-400 text-sky-400" : "border-transparent text-gray-300"}`}>{label}</Link>)}
    </nav>
    <SongSubmissionList items={items.slice(0, 20)} admin />
    <nav aria-label="Stranice predloga" className="mt-6 flex gap-6">{page > 1 && <Link href={`?status=${status}&page=${page - 1}`} className="py-3 text-sky-400">Prethodna</Link>}{items.length > 20 && <Link href={`?status=${status}&page=${page + 1}`} className="py-3 text-sky-400">Sledeca</Link>}</nav>
  </section>
}
