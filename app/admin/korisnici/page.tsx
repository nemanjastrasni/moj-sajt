import { prisma } from "@/lib/prisma"

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
  orderBy: { createdAt: "desc" },
}) as any

const onlineUsers = await prisma.$queryRaw<
  {
    user_id: string | null
    last_seen: Date
  }[]
>`
  SELECT user_id, last_seen
  FROM online_presence
`
const guests = onlineUsers.filter(
  (u) =>
    !u.user_id &&
    new Date(u.last_seen).getTime() >=
      Date.now() - 2 * 60 * 1000
)

const onlineMap = new Map()

onlineUsers.forEach((u) => {
  if (u.user_id) {
    onlineMap.set(u.user_id, u.last_seen)
  }
})

const activeSince = Date.now() - 2 * 60 * 1000

const onlineSet = new Set(
  onlineUsers
    .filter(
      (u) =>
        u.user_id &&
        new Date(u.last_seen).getTime() >= activeSince
    )
    .map((u) => u.user_id)
)
function timeAgo(date?: Date) {
  if (!date) return "-"

  const diff = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  )

  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)} min`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`

  return `${Math.floor(diff / 86400)} dana`
}
  return (
  <div className="text-gray-900">
    <h1 className="text-2xl font-bold mb-6">Korisnici</h1>

    <div className="mb-4 p-3 bg-gray-100 rounded">
      <p><b>Online korisnici:</b> {onlineSet.size}</p>
      <p><b>Online gosti:</b> {guests.length}</p>
    </div>
    {guests.length > 0 && (
  <div className="mb-6">
    <h2 className="font-bold mb-2">
      Gosti trenutno online
    </h2>

    {guests.map((g, i) => (
      <div key={i}>
        👤 Gost #{i + 1} — {timeAgo(g.last_seen)}
      </div>
    ))}
  </div>
)}

    <table className="w-full border">
        <thead>
          <tr className="bg-gray-100 text-left">
  <th className="p-2">Slika</th>
  <th className="p-2">Ime</th>
  <th className="p-2">Email</th>
  <th className="p-2">Grad</th>
  <th className="p-2">God</th>
  <th className="p-2">Role</th>
  <th className="p-2">Online</th>
  <th className="p-2">Poslednja aktivnost</th>
  <th className="p-2">Status</th>
  <th className="p-2">Akcije</th>
</tr>
        </thead>
        <tbody>
  {users.map((u: any) => (
    <tr key={u.id} className="border-t">
      <td className="p-2">
        {u.image ? (
          <img src={u.image} className="w-8 h-8 rounded-full" />
        ) : (
          "-"
        )}
      </td>
      <td className="p-2">{u.name}</td>
      <td className="p-2">{u.email}</td>
      <td className="p-2">{u.city || "-"}</td>
      <td className="p-2">{u.birthYear || "-"}</td>
      <td className="p-2">{u.role}</td>
      <td className="p-2">
  {onlineSet.has(u.id) ? "🟢 Online" : "⚫ Offline"}
</td>
<td className="p-2">
  {timeAgo(onlineMap.get(u.id))}
</td>
      <td className="p-2">
        {u.banned ? "❌ Banned" : "✅ Active"}
      </td>
      <td className="p-2">
        {!u.banned && (
          <form action={`/api/admin/users/ban`} method="POST">
            <input type="hidden" name="userId" value={u.id} />
            <button className="text-red-600 hover:underline">
              Ban
            </button>
          </form>
        )}
      </td>
    </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}