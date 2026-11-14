import { prisma } from "@/lib/prisma"
import PlaylistClient from "@/app/components/PlaylistClient"
import PlaylistCatalog from "@/app/components/PlaylistCatalog"
import { notFound } from "next/navigation"
import { playlistOrder, playlistViewerId, readablePlaylistWhere } from "@/lib/playlists/server"
import { catalogEntry } from "@/lib/playlists/catalog-model"
import { catalogPage, catalogPageNumber } from "@/lib/playlists/catalog-server"
import { isPublicCategory, routePath } from "@/lib/seo/site"
import { publicPageMetadata } from "@/lib/seo/metadata"
import { getCategoryLabel } from "@/lib/categories"

export const dynamic = "force-dynamic"
type Props = { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ params, searchParams }: Props) {
  const { id } = await params
  const entry = catalogEntry(id)
  if (!entry) return { title: "Plejlista", robots: { index: false, follow: false } }
  const query = await searchParams ?? {}
  const category = typeof query.category === "string" && isPublicCategory(query.category) ? query.category : null
  const { current, total } = await catalogPage(id, category, catalogPageNumber(query.page))
  const canonicalQuery: Record<string, string> = {}
  if (current > 1) canonicalQuery.page = String(current)
  if (category) canonicalQuery.category = category
  const label = entry.title + (category ? " – " + getCategoryLabel(category) : "")
  return {
    ...publicPageMetadata(label + " – Pesme za gitaru" + (current > 1 ? " – Strana " + current : ""), `Izbor pesama za gitaru: ${label}. Akordi, tekstovi i procena težine sviranja.`, routePath("plejliste", id), { canonicalQuery }),
    ...(!total ? { robots: { index: false, follow: true } } : {}),
  }
}
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params
  if (catalogEntry(id)) {
    const query = await searchParams ?? {}
    return <PlaylistCatalog slug={id} page={typeof query.page === "string" ? query.page : "1"} category={typeof query.category === "string" ? query.category : undefined} />
  }
  const viewerId = await playlistViewerId()
  const playlist = await prisma.playlist.findFirst({
    where: readablePlaylistWhere(id, viewerId),
    select: {
      id: true, name: true, userId: true, isPublic: true,
      songs: { orderBy: playlistOrder, select: {
        id: true, songId: true, playlistId: true, order: true,
        setting: { select: { userId: true, transpose: true, capo: true } },
        song: { select: { title: true, slug: true, category: true, artist: { select: { name: true, slug: true } } } },
      } },
    },
  })
  if (!playlist) notFound()
  const songs = playlist.songs.map(({ setting, ...item }) => ({ ...item, ...(playlist.userId === viewerId && setting?.userId === viewerId ? { settings: { transpose: setting.transpose, capo: setting.capo } } : {}) }))
  return <PlaylistClient
    key={JSON.stringify([playlist.id, playlist.name, playlist.isPublic, songs.map(item => [item.id, item.order, item.song.title, item.song.artist.name, item.settings])])}
    playlistId={playlist.id} name={playlist.name} initialPublic={playlist.isPublic}
    canEdit={playlist.userId === viewerId} initialSongs={songs}
  />
}
