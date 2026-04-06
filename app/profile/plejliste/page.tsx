
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
    songs: {
    include: {
      song: true,
    },
  },
},
    orderBy: { createdAt: "desc" },
  })
  
const domace: any[] = []
const strane: any[] = []
const narodne: any[] = []
const mix: any[] = []

playlists.forEach((p: any) => {
  const categories = p.songs.map((s: any) => s.song.category)
  const unique = [...new Set(categories)]

  if (unique.length > 1) {
    mix.push(p)
  } else {
    if (unique[0] === "domace") domace.push(p)
    else if (unique[0] === "strane") strane.push(p)
    else if (unique[0] === "narodne") narodne.push(p)
  }
})
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
  <div className="max-w-3xl mx-auto px-6 py-10">
  <h1 className="text-3xl font-bold text-center mb-10 text-white tracking-wide">
    🎧 Moje playliste
  </h1>


    {domace.length > 0 && (
  <>
    <h2 className="text-xl font-semibold mt-6 mb-2 text-blue-400">
  🇷🇸 Domaće
</h2>
    {domace.map((p: any) => (
      <PlaylistRow key={p.id} p={p} />
    ))}
  </>
)}

{strane.length > 0 && (
  <>
    <h2 className="text-xl font-semibold mt-6 mb-2 text-purple-400">
  🌍 Strane
</h2>
    {strane.map((p: any) => (
      <PlaylistRow key={p.id} p={p} />
    ))}
  </>
)}

{narodne.length > 0 && (
  <>
    <h2 className="text-xl font-semibold mt-6 mb-2 text-yellow-400">
  🎻 Narodne
</h2>
    {narodne.map((p: any) => (
      <PlaylistRow key={p.id} p={p} />
    ))}
  </>
)}

{mix.length > 0 && (
  <>
    <h2 className="text-xl font-semibold mt-6 mb-2 text-green-400">
  🔀 Mix
</h2>
    {mix.map((p: any) => (
      <PlaylistRow key={p.id} p={p} />
    ))}
  </>
)}
  </div>
)}