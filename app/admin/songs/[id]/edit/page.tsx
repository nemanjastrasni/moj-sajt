import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { requireSongAdmin } from "@/lib/adminSongs/server"
import AdminSongForm from "../../AdminSongForm"
import { songPageHref } from "@/lib/adminContent/paths"

export default async function EditSongPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  await requireSongAdmin()
  const { id } = await params
  const song = await prisma.song.findUnique({ where: { id }, include: { artist: { select: { id: true, name: true, category: true, slug: true } } } })
  if (!song) notFound()
  const returnToSong = (await searchParams).from === "song"
  return <AdminSongForm initial={song} returnToSong={returnToSong} backHref={returnToSong ? songPageHref(song, song.artist) : "/admin/songs"} />
}
