import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { requireSongAdmin } from "@/lib/adminSongs/server"
import AdminSongForm from "../../AdminSongForm"

export default async function EditSongPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSongAdmin()
  const { id } = await params
  const song = await prisma.song.findUnique({ where: { id }, include: { artist: { select: { id: true, name: true, category: true } } } })
  if (!song) notFound()
  return <AdminSongForm initial={song} />
}
