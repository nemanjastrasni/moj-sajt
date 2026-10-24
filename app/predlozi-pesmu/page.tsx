import UiText from "@/app/components/UiText"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import SongSubmissionForm from "@/app/components/SongSubmissionForm"

export const metadata = { title: "Predlozi pesmu", robots: { index: false, follow: false } }
export default async function ProposeSongPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fpredlozi-pesmu")
  return <main className="mx-auto w-full max-w-4xl px-4 py-8 text-white sm:px-6">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-2xl font-bold"><UiText text="Predlozi pesmu" /></h1>
      <Link href="/moji-predlozi" className="text-sky-400 underline"><UiText text="Moji predlozi" /></Link>
    </div>
    <SongSubmissionForm />
  </main>
}
