import { notFound, permanentRedirect } from "next/navigation"
import { catalogLetter } from "@/lib/seo/catalog"
import { isPublicCategory, routePath } from "@/lib/seo/site"
import { publicPageMetadata } from "@/lib/seo/metadata"
import { getCategoryLabel } from "@/lib/categories"
import { readLetterArtistCards } from "@/lib/artists/publicCatalog"
import Link from "next/link"
import { CategoryLabel } from "@/app/components/UiText"
import ArtistImage from "@/app/components/ArtistImage"
import { getArtistImage } from "@/lib/artistPhotos"
import styles from "@/app/components/ArtistMedia.module.css"
import SiteImage, { type SiteImageName } from "@/app/components/SiteImage"

export const dynamic = "force-dynamic"

const categoryImages: Partial<Record<string, SiteImageName>> = {
  narodne: "categoryNarodne",
  domace: "categoryDomace",
  strane: "categoryStrane",
}


type Props = { params: Promise<{ category: string; letter: string }> }

async function letterRoute(params: Props["params"]) {
  const { category, letter: raw } = await params
  const letter = catalogLetter(raw)
  if (!isPublicCategory(category) || !letter) notFound()
  if (letter.input !== letter.slug) permanentRedirect(routePath("pesme", category, "slovo", letter.slug))
  return { category, ...letter }
}

const letterArtists = readLetterArtistCards

export async function generateMetadata({ params }: Props) {
  const { category, label, slug } = await letterRoute(params)
  const artists = await letterArtists(category, label)
  return {
    ...publicPageMetadata(`${getCategoryLabel(category)} pesme – Izvođači na slovo ${label}`, `Izvođači na slovo ${label} u kategoriji ${getCategoryLabel(category)}. Pronađi pesme, akorde i tekstove.`, routePath("pesme", category, "slovo", slug)),
    ...(!artists.length ? { robots: { index: false, follow: true } } : {}),
  }
}

export default async function LetterPage({ params }: Props) {
  const { category, label: letter } = await letterRoute(params)
  const bannerImage = categoryImages[category]
  const filtered = await letterArtists(category, letter)

  return (
    <div className={styles.page}>
      <header className={bannerImage ? `theme-dark-surface ${styles.letterBanner}` : styles.letterHeading}>
        {bannerImage && <SiteImage name={bannerImage} priority alt="" className={styles.letterPhoto}
          sizes="(min-width: 1064px) 952px, (min-width: 601px) calc(100vw - 80px), calc(100vw - 64px)" />}
        <h1><CategoryLabel value={category} /> – {letter}</h1>
      </header>

      {filtered.length === 0 ? (
        <p>Nema izvođača na ovo slovo.</p>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {filtered.map((artist) => (
  <Link
    key={artist.id}
    href={`/pesme/${category}/${artist.slug}`}
    className={styles.artistRow}
  >
    <ArtistImage src={getArtistImage(artist)} name={artist.name} />

    <span>
      {artist.name} ({artist.songCount})
    </span>
  </Link>
))}
        </div>
      )}
    </div>
  )
}
