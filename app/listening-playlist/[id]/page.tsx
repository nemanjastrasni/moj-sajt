import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function ListeningPlaylistsPage() {
  const playlists = await prisma.listeningPlaylist.findMany({
    orderBy: { createdAt: "desc" },
  })

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
      <h1>Moje playliste</h1>

      <div style={{ display: "grid", gap: "10px", marginTop: "20px" }}>
        {playlists.map((pl) => (
          <Link key={pl.id} href={`/listening-playlist/${pl.id}`}>
            🎧 {pl.name}
          </Link>
        ))}
      </div>
    </div>
  )
}