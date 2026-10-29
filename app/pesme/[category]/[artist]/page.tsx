import UiText from "@/app/components/UiText"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import ArtistHeader from "@/app/components/ArtistHeader"
import { getArtistImage } from "@/lib/artistPhotos"
import styles from "@/app/components/ArtistMedia.module.css"
import AdminPageActions from "@/app/components/AdminPageActions"
import { artistContentVersion } from "@/lib/adminContent/server"
import ArtistSongList from "@/app/components/ArtistSongList"
import { BackNavigationTarget } from "@/app/components/BackNavigation"
import { artistIndexHref } from "@/lib/navigation/parent"
import { hasBiographyContent } from "@/lib/biographies/catalog"
import { performerSelect } from "@/lib/artists/performers"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: any) {
  const { category, artist } = await params
 
  const artistData = await prisma.artist.findFirst({
    where: {
      slug: artist,
      category,
    },
  })
  
  if (!artistData) {
    return { title: "Izvođač nije pronađen" }
  }
  
  return {
    title: `${artistData.name} – Pesme`,
  }
}

export default async function ArtistPage({ params }: any) {
  const { category, artist } = await params

  const artistData = await prisma.artist.findFirst({
    where: {
      slug: artist,
      category,
    },
  })

  if (!artistData) notFound()
  const songs = await prisma.song.findMany({
    where: { OR: [{ artistId: artistData.id }, { performers: { some: { artistId: artistData.id } } }] },
    select: { id: true, slug: true, title: true, chords: true, lyrics: true, difficulty: true,
      artist: { select: { slug: true, category: true } }, performers: performerSelect },
    orderBy: [{ title: "asc" }, { id: "asc" }],
  })
  const image = getArtistImage(artistData)

  return (
    <div className={styles.page}>
      <BackNavigationTarget pathname={`/pesme/${encodeURIComponent(category)}/${encodeURIComponent(artist)}`} href={artistIndexHref("pesme", category, artistData.name)} />
      <ArtistHeader name={artistData.name} image={image} />
      <AdminPageActions kind="artist" id={artistData.id} name={artistData.name} editHref={`/admin/artists/${encodeURIComponent(artistData.id)}/edit?from=artist`} biography={Boolean(artistData.bio || artistData.bioShort)} version={artistContentVersion(artistData)} />

      {/* LINK KA BIOGRAFIJI */}
      {hasBiographyContent(artistData) && <div style={{ marginBottom: "25px" }}>
        <Link
          href={`/biografija/${category}/${artistData.slug}`}
          style={{ color: "#2563eb", fontWeight: 600 }}
        >
          <UiText text="Pogledaj biografiju" />
        </Link>
      </div>}

      {songs.length === 0 && <p><UiText text="Nema pesama." /></p>}

      <ArtistSongList category={category} artist={artist} artistId={artistData.id} songs={songs} />
</div>
 
  )
}
