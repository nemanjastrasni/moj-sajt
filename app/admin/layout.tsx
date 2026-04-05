// app/admin/layout.tsx
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import BackButton from "@/app/components/BackButton"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  // nije ulogovan
  if (!session) {
    redirect("/api/auth/signin")
  }

  // ADMIN PROVERA PO EMAIL-U
  if (session.user.email?.toLowerCase() !== "nemanjaivanovic979@gmail.com") {
  redirect("/")
}

  return (
    <div className="flex min-h-screen">

      {/* SIDEBAR */}
      <aside className="w-64 bg-black text-white p-6 space-y-4">
        <h2 className="text-xl font-bold">Admin</h2>

        <nav className="space-y-2 text-sm">
  <a href="/admin" className="block hover:underline">
    Dashboard
  </a>

  <a href="/admin/edit" className="block hover:underline">
  Edit tabela
</a>

  <a href="/admin/artists" className="block hover:underline">
    Izvođači
  </a>

  <a href="/admin/songs" className="block hover:underline">
    Pesme
  </a>

  <a href="/admin/korisnici" className="block hover:underline">
  Korisnici
</a>
</nav>
      </aside>

      {/* CONTENT */}
      <main className="flex-1 p-8 bg-gray-50">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <BackButton />
        </header>

        {children}
      </main>
    </div>
  )
}