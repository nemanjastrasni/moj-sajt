import { redirectMergedArtist } from "@/lib/artists/mergeRedirect"
import { getPublicArtist } from "@/lib/publicPages"
import { publicPageMetadata } from "@/lib/seo/metadata"
import { biographyMetadataText } from "@/lib/seo/content"
import { routePath } from "@/lib/seo/site"
import Breadcrumbs from "@/app/components/Breadcrumbs"
import { getCategoryLabel } from "@/lib/categories"
import { notFound } from "next/navigation"
import BioText from "@/app/biografija/components/BioText"
import ReviewedBio from "@/app/biografija/components/ReviewedBio"
import { biographyLatin, getReviewedBiography, reviewedSerbianBiography } from "@/lib/biographies/reviewed"
import ArtistPhotoCredit from "@/app/components/ArtistPhotoCredit"
import ArtistWikiCredit from "@/app/components/ArtistWikiCredit"
import ArtistDiscography from "@/app/components/ArtistDiscography"
import ArtistImage from "@/app/components/ArtistImage"
import { getArtistImage } from "@/lib/artistPhotos"
import styles from "@/app/components/ArtistMedia.module.css"
import AdminPageActions from "@/app/components/AdminPageActions"
import { artistContentVersion } from "@/lib/adminContent/server"
import { BackNavigationTarget } from "@/app/components/BackNavigation"
import { artistIndexHref } from "@/lib/navigation/parent"
import { biographyText, hasBiographyContent } from "@/lib/biographies/catalog"
import UiText from "@/app/components/UiText"
import Link from "next/link"
import MusicButton from "@/app/components/MusicButton"
import { normalizeDiscography } from "@/lib/discography"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ category: string; artist: string }> }) {
  const { category, artist } = await params, data = await getPublicArtist(category, artist)
  if (!data) { await redirectMergedArtist(category, artist, "bio"); notFound() }
  const correction = reviewedSerbianBiography(data)
  const edition = getReviewedBiography(data)
  const text = biographyMetadataText(correction ? { ...data, bio: correction.paragraphs.sr.join(" ") } : data)
  const title = edition?.collaborationSong ? `${data.name} – Muzička saradnja` : text.title
  return {
    ...publicPageMetadata(title, text.description, routePath("biografija", category, data.slug), { image: getArtistImage(data), includeTranslations: Boolean(edition) }),
    ...(!hasBiographyContent(data) ? { robots: { index: false, follow: true } } : {}),
  }
}

export default async function BiographyPage({ params }: { params: Promise<{ category: string; artist: string }> }) {
  const { artist: artistSlug, category } = await params

  const artistData = await getPublicArtist(category, artistSlug)

  if (!artistData) { await redirectMergedArtist(category, artistSlug, "bio"); notFound() }
  const image = getArtistImage(artistData)
  const biography = biographyText(artistData.bio) || biographyText(artistData.bioShort)
  const edition = getReviewedBiography(artistData)
  const correction = reviewedSerbianBiography(artistData)
  const collaboration = edition?.collaborationSong
  const songsHref = collaboration ? routePath("pesme", category, artistData.slug, collaboration.slug) : routePath("pesme", category, artistData.slug)
  const biographyHeading = collaboration ? "Muzička saradnja" : "Biografija"
  const hasDiscography = normalizeDiscography(artistData.discography).length > 0

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[{ name: "Početna", path: "/" }, { name: "Biografije", path: "/biografija" }, { name: getCategoryLabel(category), path: routePath("biografija", category) }, { name: artistData.name, path: routePath("biografija", category, artistData.slug) }]} />
      <BackNavigationTarget pathname={`/biografija/${encodeURIComponent(category)}/${encodeURIComponent(artistSlug)}`} href={artistIndexHref("biografija", category, artistData.name)} />

      <header className={styles.biographyHero}>
        <div className={styles.biographyPhoto}><ArtistImage src={image} name={artistData.name} variant="portrait" priority /><ArtistPhotoCredit image={image} /></div>
        <div className={styles.biographyIntro}>
          <p className={styles.eyebrow}><UiText text={collaboration ? biographyHeading : biography ? hasDiscography ? "Biografija i diskografija" : "Biografija" : hasDiscography ? "Diskografija" : "Profil izvođača"} /></p>
          <h1>{artistData.name}</h1>
          <nav aria-label={artistData.name} className={styles.biographyLinks}>
            {biography && <a href="#biografija"><UiText text={biographyHeading} /></a>}
            {hasDiscography && <a href={`#discography-${artistData.id}`}><UiText text="Diskografija" /></a>}
            <Link href={songsHref}>{collaboration?.title ?? <UiText text="Pesme" />}</Link>
            {edition && <Link href={edition.route.en} hrefLang="en" lang="en">English</Link>}
          </nav>
        </div>
      </header>
      <AdminPageActions kind="artist" id={artistData.id} name={artistData.name} editHref={`/admin/artists/${encodeURIComponent(artistData.id)}/edit?from=bio`} biography={Boolean(artistData.bio || artistData.bioShort)} version={artistContentVersion(artistData)} />

      <div className="mb-6 flex flex-wrap items-center gap-3"><MusicButton /><Link
        href={songsHref}
        className="ui-button"
      >
        {collaboration ? <UiText text="Akordi za pesmu {title}" values={{ title: collaboration.title }} /> : <UiText text="Idi na pesme izvođača" />}
      </Link></div>

      {/* BIOGRAFIJA */}
      <section id="biografija" className={styles.biographyText}>
        <h2><UiText text={biographyHeading} /></h2>
        {correction ? <ReviewedBio paragraphs={correction.paragraphs.sr} sources={correction.sources} language="sr" /> : <>
          {biography ? <BioText text={biographyLatin(biography)} /> : <p><UiText text="Biografija nije dostupna." /></p>}
          {biographyText(artistData.bio) && <ArtistWikiCredit artistId={artistData.id} field="bio" value={artistData.bio} />}
        </>}
      </section>

      {/* DISKOGRAFIJA */}
      <ArtistDiscography artistId={artistData.id} value={artistData.discography} />

    </div>
  )
}
