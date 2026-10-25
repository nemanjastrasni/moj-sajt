import Image from "next/image"
import { prisma } from "@/lib/prisma"
import { requireSongAdmin } from "@/lib/adminSongs/server"
import { getAdminPresence } from "@/lib/presence/server"
import { SubmissionError } from "@/lib/submissions/validation"
import { AdminPresenceProvider, GuestPresenceList, UserPresenceCells } from "@/app/components/AdminPresence"
import UiText from "@/app/components/UiText"
import UserRoleButton from "./UserRoleButton"

export const dynamic = "force-dynamic"
export default async function AdminUsersPage() {
  const actor = await requireSongAdmin()
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, city: true, birthYear: true, image: true, role: true, banned: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })
  let snapshot = null
  try { snapshot = await getAdminPresence() }
  catch (error) { if (error instanceof SubmissionError) throw error }
  return <div className="min-w-0 text-gray-900">
    <h1 className="mb-6 text-2xl font-bold">Korisnici</h1>
    <AdminPresenceProvider key={snapshot?.checkedAt ?? "unavailable"} initial={snapshot}>
      <div className="max-w-full overflow-x-auto"><table className="w-full min-w-[1050px] border text-sm">
        <thead><tr className="bg-gray-100 text-left">
          <th className="p-2">Slika</th><th className="p-2">Ime</th><th className="p-2">Email</th><th className="p-2">Grad</th><th className="p-2">God</th><th className="p-2">Role</th><th className="p-2">Online</th>
          <th className="p-2"><UiText text="Zemlja posete (priblizno)" /></th><th className="p-2">Poslednja aktivnost</th><th className="p-2">Status</th><th className="p-2">Akcije</th>
        </tr></thead>
        <tbody>{users.map(user => <tr key={user.id} className="border-t">
          <td className="p-2">{user.image ? <Image src={user.image} width={32} height={32} unoptimized alt="" className="h-8 w-8 rounded-full object-cover" /> : "-"}</td>
          <td className="p-2">{user.name || "-"}</td><td className="p-2">{user.email}</td><td className="p-2">{user.city || "-"}</td><td className="p-2">{user.birthYear || "-"}</td><td className="p-2">{user.role}</td>
          <UserPresenceCells userId={user.id} />
          <td className="p-2">{user.banned ? "Banned" : "Active"}</td>
          <td className="p-2"><UserRoleButton key={user.id + user.role} user={user} currentId={actor.id} />
            {!user.banned && user.id !== actor.id && <form action="/api/admin/users/ban" method="POST"><input type="hidden" name="userId" value={user.id} /><button className="min-h-11 text-red-600 hover:underline">Ban</button></form>}
          </td>
        </tr>)}</tbody>
      </table></div>
      <GuestPresenceList />
    </AdminPresenceProvider>
  </div>
}
