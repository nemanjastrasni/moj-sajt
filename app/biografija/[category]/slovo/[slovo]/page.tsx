import { cache } from "react"
import { notFound, permanentRedirect } from "next/navigation"
import { BiographyArtists } from "@/app/biografija/components/BiographyCatalog"
import { readBiographyArtists } from "@/lib/biographies/server"
import { artistsForBiographyLetter } from "@/lib/biographies/catalog"
import { catalogLetter } from "@/lib/seo/catalog"
import { publicPageMetadata } from "@/lib/seo/metadata"
import { isPublicCategory, routePath } from "@/lib/seo/site"
import { getCategoryLabel } from "@/lib/categories"

export const dynamic = "force-dynamic"
type Props = { params: Promise<{ category: string; slovo: string }> }
const artistsForCategory = cache(readBiographyArtists)

async function letterRoute(params: Props["params"]) {
  const { category, slovo } = await params
  const letter = catalogLetter(slovo, "biographies")
  if (!isPublicCategory(category) || !letter) notFound()
  if (letter.input !== letter.slug) permanentRedirect(routePath("biografija", category, "slovo", letter.slug))
  return { category, ...letter }
}

export async function generateMetadata({ params }: Props) {
  const { category, label, slug } = await letterRoute(params)
  const artists = artistsForBiographyLetter(await artistsForCategory(category), label)
  return {
    ...publicPageMetadata(`${getCategoryLabel(category)} izvođači na slovo ${label} – Biografije`, `Biografije i diskografije izvođača na slovo ${label} u kategoriji ${getCategoryLabel(category)}.`, routePath("biografija", category, "slovo", slug)),
    ...(!artists.length ? { robots: { index: false, follow: true } } : {}),
  }
}

export default async function ArtistsByLetter({ params }: Props) {
  const { category, label } = await letterRoute(params)
  return <BiographyArtists category={category} letter={label} artists={await artistsForCategory(category)} />
}
