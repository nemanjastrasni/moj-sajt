import { BiographyLetters } from "@/app/biografija/components/BiographyCatalog"
import { readBiographyArtists } from "@/lib/biographies/server"

export const dynamic = "force-dynamic"

export default async function BioCategory({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  return <BiographyLetters category={category} artists={await readBiographyArtists(category)} />
}
