import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import SongClient from "../../../../components/SongClient"
import type { Metadata } from "next"
import AdminPageActions from "@/app/components/AdminPageActions"
import { artistPageHref } from "@/lib/adminContent/paths"
import { songReviewVersion } from "@/lib/songReview/server"
import { BackNavigationTarget } from "@/app/components/BackNavigation"
import { playlistReturnHref } from "@/lib/navigation/parent"
import { isFavoriteView } from "@/lib/favorites/model"

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
  const { artist, slug } = await params

  const title = slug.replace(/-/g, " ")
  const artistName = artist.replace(/-/g, " ")

  return {
    title: `${title} - ${artistName} akordi`,
    description: `Akordi i tekst pesme ${title} od ${artistName}.`,
  }
}

export default async function SongPage({ params, searchParams }: Props) {
  const { artist, slug, category } = await params
  const query = await searchParams ?? {}
  const playlist = playlistReturnHref(query.playlist)
  const fromFavorites = isFavoriteView(query, playlist)
  const returnTo = playlist ?? (fromFavorites ? "/favorite" : null)
  const pathname = "/pesme/" + [category, artist, slug].map(encodeURIComponent).join("/")

  const song = await prisma.song.findFirst({
    where: {
      slug,
      artist: {
        slug: artist,
        category: category,
      },
    },
    include: {
      artist: true,
    },
  })

  if (!song) {
    notFound()
  }
 await prisma.song.update({
  where: {
    id: song.id,
  },
  data: {
    popularity: {
      increment: 1,
    },
  },
})

  return (
    <>
    {returnTo && <BackNavigationTarget pathname={pathname} href={returnTo} />}
    <SongClient
      key={song.id + (fromFavorites ? ":favorite" : ":original")}
      fromFavorites={fromFavorites}
      adminTools={<AdminPageActions kind="song" id={song.id} name={song.title} songVersion={songReviewVersion(song)} editHref={`/admin/songs/${encodeURIComponent(song.id)}/edit?from=song`} afterDelete={artistPageHref(song.artist)} />}
      song={{
        id: song.id,
        title: song.title,
        artist: song.artist.name,
        lyrics: song.lyrics ?? undefined,
        chords: song.chords ?? undefined,
        category: song.artist.category ?? undefined,
        artistSlug: song.artist.slug,
        artistName: song.artist.name,
      }}
      /*media={media}*/
    />
    </>
  )
}
