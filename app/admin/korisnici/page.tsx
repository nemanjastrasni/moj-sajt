import { prisma } from "@/lib/prisma"

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
  orderBy: { createdAt: "desc" },
}) as any

  return (
    <div className="text-gray-900">
      <h1 className="text-2xl font-bold mb-6">Korisnici</h1>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100 text-left">
  <th className="p-2">Slika</th>
  <th className="p-2">Ime</th>
  <th className="p-2">Email</th>
  <th className="p-2">Grad</th>
  <th className="p-2">God</th>
  <th className="p-2">Role</th>
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