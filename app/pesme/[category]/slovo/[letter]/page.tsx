import { cache } from "react"
import { notFound, permanentRedirect } from "next/navigation"
import { catalogLetter } from "@/lib/seo/catalog"
import { isPublicCategory, routePath } from "@/lib/seo/site"
import { publicPageMetadata } from "@/lib/seo/metadata"
import { getCategoryLabel } from "@/lib/categories"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { CategoryLabel } from "@/app/components/UiText"
import ArtistImage from "@/app/components/ArtistImage"
import { getArtistImage } from "@/lib/artistPhotos"
import styles from "@/app/components/ArtistMedia.module.css"
import { isResolvedCollaboration } from "@/lib/artists/performers"
import SiteImage, { type SiteImageName } from "@/app/components/SiteImage"

export const dynamic = "force-dynamic"

const categoryImages: Partial<Record<string, SiteImageName>> = {
  narodne: "categoryNarodne",
  domace: "categoryDomace",
  strane: "categoryStrane",
}


function getFirstLetter(name?: string) {

  if (!name) return ""

  const upper = name.trim().toUpperCase()

  if (upper.startsWith("DŽ")) return "DŽ"
  if (upper.startsWith("LJ")) return "LJ"
  if (upper.startsWith("NJ")) return "NJ"

  return upper[0]
}

type Props = { params: Promise<{ category: string; letter: string }> }

async function letterRoute(params: Props["params"]) {
  const { category, letter: raw } = await params
  const letter = catalogLetter(raw)
  if (!isPublicCategory(category) || !letter) notFound()
  if (letter.input !== letter.slug) permanentRedirect(routePath("pesme", category, "slovo", letter.slug))
  return { category, ...letter }
}

const letterArtists = cache(async (category: string, letter: string) => {
  const isSpecial = letter === "#"
  const artists = await prisma.artist.findMany({
  where: { category },
  orderBy: { name: "asc" },
  select: { id: true, name: true, slug: true, category: true, image: true,
    songs: { select: { id: true, performers: { select: { artistId: true } } } },
    performances: { select: { songId: true } },
  },
})

  const filtered = artists.filter((artist) => {
  if (isResolvedCollaboration(artist.songs)) return false
  const first = getFirstLetter(artist.name)

  if (isSpecial) {
  return !/^[A-ZČĆŽŠĐ]/.test(artist.name.trim().toUpperCase())
}

  return first === letter
})
  return filtered
})

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
      {artist.name} ({new Set([...artist.songs.map(song => song.id), ...artist.performances.map(row => row.songId)]).size})
    </span>
  </Link>
))}
        </div>
      )}
    </div>
  )
}
