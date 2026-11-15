import Link from "next/link"
import type { Metadata } from "next"
import { readArtistCards } from "@/lib/artists/publicCatalog"
import GuideText from "@/app/components/GuideText"
import { categoryContent } from "@/lib/seo/categoryContent"
import guide from "@/app/components/CatalogGuide.module.css"
import ArtistMosaic from "@/app/components/ArtistMosaic"
import styles from "@/app/components/ArtistMedia.module.css"
import { publicPageMetadata } from "@/lib/seo/metadata"
import { isPublicCategory, routePath } from "@/lib/seo/site"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export async function generateMetadata(
  { params }: { params: Promise<{ category: string }> }
): Promise<Metadata> {
  const { category } = await params
  if (!isPublicCategory(category)) notFound()
  const copy = categoryContent[category]
  return publicPageMetadata(copy.title, copy.description, routePath("pesme", category))
}


export default async function CategoryPage(
  { params }: { params: Promise<{ category: string }> }
) {

  const { category } = await params
  if (!isPublicCategory(category)) notFound()
  const copy = categoryContent[category]

  const artists = await readArtistCards(category)

const lettersSet = new Set<string>()

artists.forEach(artist=>{

  if(!artist.name) return
  const name = artist.name.trim().toUpperCase()

  if(name.startsWith("DŽ")) return lettersSet.add("DŽ")
  if(name.startsWith("LJ")) return lettersSet.add("LJ")
  if(name.startsWith("NJ")) return lettersSet.add("NJ")

  const first = name[0]

  if(/^[0-9]/.test(first)){
  lettersSet.add("#")
}else if(/^[A-ZČĆŽŠĐ]/.test(first)){
  lettersSet.add(first)
}
})

const letters = Array.from(lettersSet).sort()

  return (
  <div className={styles.page}>
      <h1 className={styles.heading}>
        <GuideText text={copy.heading} />
      </h1>
      <div className={guide.guide}>
        <p><GuideText text={copy.intro} /></p>
        <nav className={guide.links} aria-label="Pesme i vežbanje">
          <Link href={`/plejliste/${category}`} prefetch={false}><GuideText text={{ sr: "Izbor pesama za vežbanje", en: "Songs for practice" }} /></Link>
          <Link href="/akordi" prefetch={false}><GuideText text={{ sr: "Dijagrami i oznake akorda", en: "Chord diagrams and symbols" }} /></Link>
          <Link href="/vodici" prefetch={false}><GuideText text={{ sr: "Uputstva za gitaru i plejliste", en: "Guitar and playlist guides" }} /></Link>
        </nav>
      </div>

      <nav className={styles.letters} aria-label="A-Z">

        {letters.map((letter)=>(
          <Link
            key={letter}
            href={`/pesme/${category}/slovo/${letter === "#" ? "num" : letter.toLowerCase()}`}
          >
            {letter}
          </Link>
        ))}

      </nav>
      <ArtistMosaic artists={artists} category={category} />
    </div>
  )
}
