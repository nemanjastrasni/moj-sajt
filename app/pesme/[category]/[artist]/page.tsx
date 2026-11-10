import UiText from "@/app/components/UiText"
import { notFound } from "next/navigation"
import { readArtistSongCards } from "@/lib/artists/publicCatalog"
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
import { getPublicArtist } from "@/lib/publicPages"
import { publicPageMetadata } from "@/lib/seo/metadata"
import { routePath } from "@/lib/seo/site"
import Breadcrumbs from "@/app/components/Breadcrumbs"
import { getCategoryLabel } from "@/lib/categories"

export const dynamic = "force-dynamic"
type ArtistProps = { params: Promise<{ category: string; artist: string }> }

export async function generateMetadata({ params }: ArtistProps) {
  const { category, artist } = await params
 
  const artistData = await getPublicArtist(category, artist)
  
  if (!artistData) {
    notFound()
  }
  
  return publicPageMetadata(`${artistData.name} – Akordi i tekstovi pesama`, `Pesme izvođača ${artistData.name}: akordi, tekstovi, procena težine i repertoar za sviranje.`, routePath("pesme", category, artistData.slug), { image: getArtistImage(artistData) })
}

export default async function ArtistPage({ params }: ArtistProps) {
  const { category, artist } = await params

  const artistData = await getPublicArtist(category, artist)

  if (!artistData) notFound()
  const songs = await readArtistSongCards(artistData.id)
  const image = getArtistImage(artistData)

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[{ name: "Početna", path: "/" }, { name: "Pesme", path: "/pesme" }, { name: getCategoryLabel(category), path: routePath("pesme", category) }, { name: artistData.name, path: routePath("pesme", category, artistData.slug) }]} />
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
