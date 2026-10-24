import Link from "next/link"
import { prisma } from "@/lib/prisma"
import ArtistImage from "@/app/components/ArtistImage"
import { getArtistImage } from "@/lib/artistPhotos"
import styles from "@/app/components/ArtistMedia.module.css"

export default async function ArtistsByLetter({ params }: { params: Promise<{ category: string; slovo: string }> }){

    function normalizeLetter(letter: string) {
  return decodeURIComponent(letter).toUpperCase()
}

function getFirstLetter(name?: string) {
  if (!name) return ""
  return name.trim().toUpperCase()[0]
}

const { category, slovo } = await params
const letter = normalizeLetter(slovo)
const isSpecial = letter === "#" || letter === "NUM"

let artists = []

if (isSpecial) {
  const all = await prisma.artist.findMany({
  where: { category },
  orderBy: { name: "asc" },
  select: {
    id: true,
    name: true,
    slug: true,
    category: true,
    image: true
  }
})

  artists = all.filter(a => {
    const first = a.name?.[0]?.toUpperCase()
    return first && !/^[A-ZČĆŠĐŽ]/.test(first)
  })

} else {

artists = await prisma.artist.findMany({
  where: {
    category,
    name: {
      startsWith: letter
    }
  },
  orderBy: { name: "asc" },
  select: {
    id: true,
    name: true,
    slug: true,
    category: true,
    image: true
  }
})

}

return(

<div className={styles.page}>

<h1 style={{fontSize:"28px",marginBottom:"20px"}}>
Izvođači - {letter?.toUpperCase()}
</h1>

<div style={{display:"grid",gap:"8px"}}>

{artists?.map(a=>(
<Link
  key={a.id}
  href={`/biografija/${category}/${a.slug}`}
  className={styles.artistRow}
>

  <ArtistImage src={getArtistImage(a)} name={a.name} />

  <span>{a.name}</span>

</Link>
))}

</div>

</div>

)

}
