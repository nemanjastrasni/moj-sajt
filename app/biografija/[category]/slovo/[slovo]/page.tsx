import { BiographyArtists } from "@/app/biografija/components/BiographyCatalog"
import { readBiographyArtists } from "@/lib/biographies/server"

export const dynamic = "force-dynamic"

export default async function ArtistsByLetter({ params }: { params: Promise<{ category: string; slovo: string }> }) {
  const { category, slovo } = await params
  return <BiographyArtists category={category} letter={slovo} artists={await readBiographyArtists(category)} />
}
