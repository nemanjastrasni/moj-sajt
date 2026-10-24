// app/admin/layout.tsx
import { redirect } from "next/navigation"
import { requireSongAdmin } from "@/lib/adminSongs/server"
import { SubmissionError } from "@/lib/submissions/validation"
import BackButton from "@/app/components/BackButton"
import Link from "next/link"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try { await requireSongAdmin() }
  catch (error) {
    if (error instanceof SubmissionError && error.status === 401) redirect("/login?callbackUrl=%2Fadmin")
    if (error instanceof SubmissionError && error.status === 403) redirect("/")
    throw error
  }

  return (
    <div className="flex min-h-screen min-w-0 flex-col md:flex-row">

      {/* SIDEBAR */}
      <aside className="w-full shrink-0 bg-black text-white p-6 space-y-4 md:w-64">
        <h2 className="text-xl font-bold">Admin</h2>

        <nav className="space-y-2 text-sm">
  <Link href="/admin/predlozi" className="block hover:underline">
    Predlozi pesama
  </Link>
  <Link href="/admin" className="block hover:underline">
    Dashboard
  </Link>

  <Link href="/admin/edit" className="block hover:underline">
  Edit tabela
</Link>

  <Link href="/admin/artists" className="block hover:underline">
    Izvođači
  </Link>

  <Link href="/admin/songs" className="block hover:underline">
    Pesme
  </Link>

  <Link href="/admin/korisnici" className="block hover:underline">
  Korisnici
</Link>
</nav>
      </aside>

      {/* CONTENT */}
      <main className="min-w-0 flex-1 p-4 bg-gray-50 sm:p-8">
        <header className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <BackButton />
        </header>

        {children}
      </main>
    </div>
  )
}
