import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import SongSubmissionList from "@/app/components/SongSubmissionList"

export const metadata = { title: "Moji predlozi", robots: { index: false, follow: false } }
export default async function MySubmissionsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fmoji-predlozi")
  const page = Math.max(1, Math.min(10000, Number.parseInt((await searchParams).page ?? "1", 10) || 1))
  let items
  try {
    items = await prisma.songSubmission.findMany({
      where: { userId: session.user.id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 21, skip: (page - 1) * 20,
      select: { id: true, title: true, artistName: true, category: true, status: true, createdAt: true, reviewNote: true,
        publishedSong: { select: { slug: true, artist: { select: { slug: true, category: true } } } } },
    })
  } catch { return <main className="mx-auto max-w-4xl px-4 py-8 text-white"><h1 className="mb-4 text-2xl font-bold">Moji predlozi</h1><p role="alert">Predlozi trenutno nisu dostupni. Pokusaj ponovo kasnije.</p></main> }
  return <main className="mx-auto w-full max-w-4xl px-4 py-8 text-white sm:px-6">
    <div className="mb-6 flex flex-wrap justify-between gap-4"><h1 className="text-2xl font-bold">Moji predlozi</h1><Link href="/predlozi-pesmu" className="text-sky-400 underline">Predlozi pesmu</Link></div>
    <SongSubmissionList items={items.slice(0, 20)} />
    <nav aria-label="Stranice predloga" className="mt-6 flex gap-6">{page > 1 && <Link href={`?page=${page - 1}`} className="py-3 text-sky-400">Prethodna</Link>}{items.length > 20 && <Link href={`?page=${page + 1}`} className="py-3 text-sky-400">Sledeca</Link>}</nav>
  </main>
}
