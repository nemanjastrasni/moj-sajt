import { notFound } from "next/navigation"
import { BiographyLetters } from "@/app/biografija/components/BiographyCatalog"
import { readBiographyArtists } from "@/lib/biographies/server"
import { publicPageMetadata } from "@/lib/seo/metadata"
import { isPublicCategory, routePath } from "@/lib/seo/site"
import { getCategoryLabel } from "@/lib/categories"

export const dynamic = "force-dynamic"
type Props = { params: Promise<{ category: string }> }

export async function generateMetadata({ params }: Props) {
  const { category } = await params
  if (!isPublicCategory(category)) notFound()
  return publicPageMetadata(`${getCategoryLabel(category)} izvođači – Biografije i diskografije`, `Biografije i diskografije izvođača u kategoriji ${getCategoryLabel(category)}. Pregledaj muzičare i bendove po početnom slovu.`, routePath("biografija", category))
}

export default async function BioCategory({ params }: Props) {
  const { category } = await params
  if (!isPublicCategory(category)) notFound()
  return <BiographyLetters category={category} artists={await readBiographyArtists(category)} />
}
