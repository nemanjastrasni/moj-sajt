import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { requireSongAdmin } from "@/lib/adminSongs/server"

export default async function MergeArtist({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ search?: string; category?: string; letter?: string }>
}) {
  await requireSongAdmin()
  const { id } = await params, filters = await searchParams
  const artist = await prisma.artist.findUnique({ where: { id }, select: { id: true, name: true } })
  if (!artist) notFound()
  const query = new URLSearchParams({ merge: id, search: filters.search ?? artist.name.split(/\s+/)[0] })
  if (filters.category) query.set("category", filters.category)
  if (filters.letter) query.set("letter", filters.letter)
  redirect("/admin/artists?" + query.toString())
}
