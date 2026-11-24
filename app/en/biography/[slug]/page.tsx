import Link from "next/link"
import { notFound } from "next/navigation"
import { biographyRoutes } from "@/lib/biographies/routes"
import { getReviewedBiography } from "@/lib/biographies/reviewed"
import { getPublicArtist } from "@/lib/publicPages"
import { getArtistImage } from "@/lib/artistPhotos"
import { biographySummary } from "@/lib/seo/content"
import { publicPageMetadata } from "@/lib/seo/metadata"
import { routePath } from "@/lib/seo/site"
import ArtistImage from "@/app/components/ArtistImage"
import ArtistPhotoCredit from "@/app/components/ArtistPhotoCredit"
import ArtistDiscography from "@/app/components/ArtistDiscography"
import ReviewedBio from "@/app/biografija/components/ReviewedBio"
import styles from "@/app/components/ArtistMedia.module.css"

export const dynamic = "force-dynamic"
type Props = { params: Promise<{ slug: string }> }

async function loadProfile(slug: string) {
  const route = biographyRoutes.find(profile => profile.slug === slug)
  if (!route) notFound()
  const artist = await getPublicArtist(route.category, route.slug)
  if (!artist) notFound()
  const edition = getReviewedBiography(artist)
  if (!edition) notFound()
  return { artist, edition, image: getArtistImage(artist) }
}

export async function generateMetadata({ params }: Props) {
  const { artist, edition, image } = await loadProfile((await params).slug)
  const description = biographySummary(edition.paragraphs.en[0])
  return publicPageMetadata(`${artist.name} – Biography`, description, edition.route.en, { image })
}

export default async function EnglishBiographyPage({ params }: Props) {
  const { artist, edition, image } = await loadProfile((await params).slug)
  return <article className={styles.page}>
    <header className={styles.biographyHero}>
      <div className={styles.biographyPhoto}>
        <ArtistImage src={image} name={artist.name} variant="portrait" priority />
        <ArtistPhotoCredit image={image} />
      </div>
      <div className={styles.biographyIntro}>
        <p className={styles.eyebrow}>Artist biography</p>
        <h1>{artist.name}</h1>
        <nav className={styles.biographyLinks} aria-label="Artist links">
          <Link href={routePath("pesme", edition.route.category, edition.route.slug)}>Songs with chords</Link>
          <Link href={edition.route.sr} hrefLang="sr-Latn" lang="sr-Latn">Srpski</Link>
        </nav>
      </div>
    </header>
    <section id="biografija" className={styles.biographyText}>
      <h2>Biography</h2>
      <ReviewedBio paragraphs={edition.paragraphs.en} sources={edition.sources} language="en" />
    </section>
    <ArtistDiscography artistId={artist.id} value={artist.discography} />
  </article>
}
