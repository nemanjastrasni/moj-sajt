import { prisma } from "@/lib/prisma"
import { requireSongAdmin } from "@/lib/adminSongs/server"
import { getAdminPresence } from "@/lib/presence/server"
import { SubmissionError } from "@/lib/submissions/validation"
import AdminUsersView from "./AdminUsersView"

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
  return <AdminUsersView users={users} actorId={actor.id} snapshot={snapshot} />
}
