// app/admin/layout.tsx
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"

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

  // nije admin
  if (session.user.role !== "admin") {
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
        {children}
      </main>
    </div>
  )
}