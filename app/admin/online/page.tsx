import { prisma } from "@/lib/prisma"

export default async function OnlinePage() {
  const activeSince = new Date(Date.now() - 2 * 60 * 1000)

  const online = await prisma.$queryRaw<any[]>`
    SELECT
      p.visitor_id,
      p.user_id,
      p.last_seen,
      u.name,
      u.email
    FROM online_presence p
    LEFT JOIN "User" u
      ON u.id = p.user_id
    WHERE p.last_seen >= ${activeSince}
    ORDER BY p.last_seen DESC
  `

  const loggedUsers = online.filter((u) => u.user_id)
  const guests = online.filter((u) => !u.user_id)

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Online korisnici
      </h1>

      <div className="mb-8">
        <p>Ukupno online: {online.length}</p>
        <p>Ulogovani: {loggedUsers.length}</p>
        <p>Gosti: {guests.length}</p>
      </div>

      <h2 className="text-xl font-bold mb-3">
        Ulogovani korisnici
      </h2>

      <div className="space-y-2 mb-8">
        {loggedUsers.map((user) => (
          <div
            key={user.visitor_id}
            className="border rounded p-3"
          >
            🟢 {user.name || "Bez imena"}
            <br />
            <span className="text-sm text-gray-500">
              {user.email}
            </span>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold mb-3">
        Gosti
      </h2>

      <div className="space-y-2">
        {guests.map((guest, index) => (
          <div
            key={guest.visitor_id}
            className="border rounded p-3"
          >
            👤 Gost #{index + 1}
          </div>
        ))}
      </div>
    </div>
  )
}