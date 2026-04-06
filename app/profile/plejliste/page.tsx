
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import PlaylistActions from "@/app/components/PlaylistActions"

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
  
  const domace = playlists.filter((p: any) => p.category === "domace")
  const strane = playlists.filter((p: any) => p.category === "strane")
  const narodne = playlists.filter((p: any) => p.category === "narodne")
  const mix = playlists.filter((p: any) => !p.category || p.category === "mix")
  const PlaylistRow = ({ p }: any) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px 0",
      borderBottom: "1px solid #222",
    }}
  >
    <div>
      <Link href={`/plejliste/${p.id}`} style={{ fontWeight: "bold" }}>
        {p.name}
      </Link>
      <div style={{ fontSize: "12px", color: "#888" }}>
        {p.songs.length} pesama
      </div>
    </div>

    <div style={{ display: "flex", gap: "10px" }}>
      <PlaylistActions id={p.id} name={p.name} />
    </div>
  </div>
)
  
  return (
  <div style={{ padding: "40px", maxWidth: "700px", margin: "0 auto" }}>
    <h1 style={{ textAlign: "center", marginBottom: "30px" }}>
  Moje playliste
</h1>


    {domace.length > 0 && (
  <>
    <h2>Domaće</h2>
    {domace.map((p: any) => (
      <PlaylistRow key={p.id} p={p} />
    ))}
  </>
)}

{strane.length > 0 && (
  <>
    <h2>Strane</h2>
    {strane.map((p: any) => (
      <PlaylistRow key={p.id} p={p} />
    ))}
  </>
)}

{narodne.length > 0 && (
  <>
    <h2>Narodne</h2>
    {narodne.map((p: any) => (
      <PlaylistRow key={p.id} p={p} />
    ))}
  </>
)}

{mix.length > 0 && (
  <>
    <h2>Mix</h2>
    {mix.map((p: any) => (
      <PlaylistRow key={p.id} p={p} />
    ))}
  </>
)}
  </div>
)}