import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function MojePlayliste() {
  const session = await getServerSession(authOptions)
  if (!session) return <div>Nisi ulogovan</div>

  // 👉 uzmi user iz baze preko email
  const user = await prisma.user.findUnique({
    where: { email: session.user?.email! },
  })

  if (!user) return <div>User ne postoji</div>

  const playlists = await prisma.playlist.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
      
      <h1 style={{ fontSize: "28px", marginBottom: "20px" }}>
        Moje playliste
      </h1>

      {/* ➕ NOVA PLAYLISTA */}
      <button
        onClick={async () => {
          const name = prompt("Naziv playliste")
          if (!name) return

          await fetch("/api/playlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
          })

          location.reload()
        }}
        style={{
          marginBottom: "20px",
          padding: "8px 12px",
          background: "#3b82f6",
          color: "white",
          borderRadius: "6px",
        }}
      >
        + Nova playlista
      </button>

      {playlists.length === 0 && (
        <div>Nemaš još playlisti</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {playlists.map((p) => (
          <div key={p.id}>
            <Link
              href={`/plejliste/${p.id}`}
              style={{ color: "#3b82f6", fontSize: "18px" }}
            >
              {p.name}
            </Link>
          </div>
        ))}
      </div>

    </div>
  )
}