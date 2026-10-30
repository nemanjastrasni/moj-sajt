import Link from "next/link"
import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { getCategoryLabel } from "@/lib/categories"
import { CategoryLabel } from "@/app/components/UiText"
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
  const pretty = getCategoryLabel(category)

  return publicPageMetadata(`${pretty} pesme – Akordi i tekstovi`, `Lista izvođača i pesama u kategoriji ${pretty}.`, routePath("pesme", category))
}


export default async function CategoryPage(
  { params }: { params: Promise<{ category: string }> }
) {

  const { category } = await params
  if (!isPublicCategory(category)) notFound()

  const artists = await prisma.artist.findMany({
  where: { category },
  select: { id: true, name: true, slug: true, category: true, image: true, _count: { select: { songs: true } } },
})

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
        <CategoryLabel value={category} />
      </h1>

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
