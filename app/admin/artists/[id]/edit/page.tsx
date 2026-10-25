import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { requireSongAdmin } from "@/lib/adminSongs/server"
import { artistContentVersion } from "@/lib/adminContent/server"
import { artistPageHref, type ArtistReturn } from "@/lib/adminContent/paths"
import ArtistEditForm from "../../ArtistEditForm"

export default async function EditArtistPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string; search?: string; category?: string; letter?: string }>
}) {
  await requireSongAdmin()
  const { id } = await params, sp = await searchParams
  const artist = await prisma.artist.findUnique({ where: { id } })
  if (!artist) notFound()
  const destination = ["artist", "bio", "info"].includes(sp.from || "") ? sp.from as ArtistReturn : "list"
  const filters = new URLSearchParams()
  for (const key of ["search", "category", "letter"] as const) if (sp[key]) filters.set(key, sp[key]!)
  const backHref = destination === "list" ? "/admin/artists" + (filters.size ? "?" + filters.toString() : "") : artistPageHref(artist, destination)
  return <ArtistEditForm initial={{ id: artist.id, name: artist.name, bio: artist.bio, image: artist.image, category: artist.category, discography: artist.discography, version: artistContentVersion(artist) }} destination={destination} backHref={backHref} />
}
