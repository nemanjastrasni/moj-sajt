import { notFound, redirect } from "next/navigation"
import { headers } from "next/headers"
import { getPublicSong } from "@/lib/publicPages"
import { countSongViewAfterResponse } from "@/lib/songViews"
import { publicPageMetadata } from "@/lib/seo/metadata"
import { routePath } from "@/lib/seo/site"
import SongClient from "../../../../components/SongClient"
import type { Metadata } from "next"
import AdminPageActions from "@/app/components/AdminPageActions"
import { artistPageHref } from "@/lib/adminContent/paths"
import { songReviewVersion } from "@/lib/songReview/server"
import { BackNavigationTarget } from "@/app/components/BackNavigation"
import { playlistReturnHref } from "@/lib/navigation/parent"
import { isFavoriteView } from "@/lib/favorites/model"
import { catalogEntry } from "@/lib/playlists/catalog"
import { performanceHref } from "@/lib/performance/model"
import { performerArtists, performerHref } from "@/lib/artists/performers"
import { playlistViewerId } from "@/lib/playlists/server"
import { omiljeneId } from "@/lib/playlists/omiljene"

type Props = {
  params: Promise<{
    category: string
    artist: string
    slug: string
  }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const { category, artist, slug } = await params
  const song = await getPublicSong(category, artist, slug)
  if (!song) notFound()
  return publicPageMetadata(`${song.title} – ${song.artist.name}: akordi i tekst`, `Akordi i tekst pesme ${song.title} – ${song.artist.name}. Tonalitet, capo preporuke i prikaz za sviranje.`, routePath("pesme", category, song.artist.slug, song.slug))
}

export default async function SongPage({ params, searchParams }: Props) {
  const { artist, slug, category } = await params
  const query = await searchParams ?? {}
  const playlist = playlistReturnHref(query.playlist)
  const fromFavorites = isFavoriteView(query, playlist)
  if (fromFavorites) {
    const userId = await playlistViewerId(), id = userId ? await omiljeneId(userId) : null
    if (id) redirect(routePath("pesme", category, artist, slug) + "?playlist=" + encodeURIComponent("/plejliste/" + id) + (query.play === "1" ? "&play=1" : ""))
  }
  const pathname = "/pesme/" + [category, artist, slug].map(encodeURIComponent).join("/")
  const playlistMatch = playlist?.match(/^\/plejliste\/([a-zA-Z0-9_-]+)$/)
  const playablePlaylist = playlistMatch && !catalogEntry(playlistMatch[1]) && !["pesme-koje-znam", "top-user", "generisane", "kategorija"].includes(playlistMatch[1]) ? playlistMatch[1] : null

  const song = await getPublicSong(category, artist, slug)

  if (!song) {
    notFound()
  }
  const performers = performerArtists(song.performers)
  const fromArtist = typeof query.artist === "string" ? performers.find(artist => artist.id === query.artist) : undefined
  const returnTo = playlist ?? (fromFavorites ? "/favorite" : fromArtist ? performerHref(fromArtist) : performers[0] ? performerHref(performers[0]) : null)
  const contentVersion = songReviewVersion(song)
  countSongViewAfterResponse(song.id, await headers())

  return (
    <>
    {returnTo && <BackNavigationTarget pathname={pathname} href={returnTo} />}
    <SongClient
      key={song.id + (fromFavorites ? ":favorite" : ":original") + (query.play === "1" ? ":play" : "")}
      fromFavorites={fromFavorites}
      startPerformance={query.play === "1"}
      songVersion={contentVersion}
      performanceHref={playablePlaylist ? performanceHref(playablePlaylist, song.id) : undefined}
      playlistId={playablePlaylist ?? undefined}
      adminTools={<AdminPageActions kind="song" id={song.id} name={song.title} songVersion={contentVersion} editHref={`/admin/songs/${encodeURIComponent(song.id)}/edit?from=song`} afterDelete={artistPageHref(song.artist)} />}
      song={{
        id: song.id,
        title: song.title,
        artist: song.artist.name,
        lyrics: song.lyrics ?? undefined,
        chords: song.chords ?? undefined,
        category: song.artist.category ?? undefined,
        artistSlug: song.artist.slug,
        artistName: song.artist.name,
        performers,
      }}
      /*media={media}*/
    />
    </>
  )
}
