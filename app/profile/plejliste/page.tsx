import UiText from "@/app/components/UiText"
import PersonalPlaylists from "@/app/components/PersonalPlaylists"
import { playlistViewerId } from "@/lib/playlists/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export default async function Page() {
  const userId = await playlistViewerId()
  if (!userId) return <p><UiText text="Nisi ulogovan" /></p>
  const playlists = await prisma.playlist.findMany({
    where: { userId },
    select: { id: true, name: true, isPublic: true, category: true, songs: { select: { song: { select: { category: true } } } } },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  })
  return <PersonalPlaylists playlists={playlists} />
}
