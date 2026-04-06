import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function Page() {
  const session = await getServerSession(authOptions)
  if (!session) return <div>Nisi ulogovan</div>

  const user = await prisma.user.findUnique({
    where: { email: session.user?.email! },
  })

  if (!user) return <div>User ne postoji</div>

  const playlists = await prisma.playlist.findMany({
    where: { userId: user.id },
    include: {
    songs: true,
},
    orderBy: { createdAt: "desc" },
  })

  return (
    <div style={{ padding: "40px" }}>
      <h1>Moje playliste</h1>

      {playlists.map((p: any) => (
        <div key={p.id}>
          <Link href={`/plejliste/${p.id}`}>
            {p.name} ({p.songs.length})
          </Link>
          <button
  onClick={async () => {
    const newName = prompt("Novo ime:", p.name)
    if (!newName) return

    await fetch("/api/playlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playlistId: p.id,
        name: newName,
      }),
    })

    location.reload()
  }}
>
  ✏️
</button>
<button
  onClick={async () => {
    if (!confirm("Obriši playlistu?")) return

    await fetch("/api/playlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playlistId: p.id,
      }),
    })

    location.reload()
  }}
>
  🗑
</button>
        </div>
      ))}
    </div>
  )
}