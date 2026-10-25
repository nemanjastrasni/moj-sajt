import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { playlistViewerId, readablePlaylistWhere } from "@/lib/playlists/server"
import PlaylistPerformance from "@/app/components/PlaylistPerformance"
export const dynamic = "force-dynamic"
export const metadata = { robots: { index: false, follow: false } }
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ song?: string | string[] }> }) {
  const { id } = await params, { song } = await searchParams
  const playlist = await prisma.playlist.findFirst({ where: readablePlaylistWhere(id, await playlistViewerId()), select: { id: true } })
  if (!playlist) notFound()
  return <PlaylistPerformance key={id} playlistId={id} initialSong={typeof song === "string" ? song : undefined} />
}
