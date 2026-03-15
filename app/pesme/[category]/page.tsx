import Link from "next/link"
import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

function formatCategory(category: string) {
  if (category === "domace") return "Domaće"
  if (category === "strane") return "Strane"
  if (category === "narodne") return "Narodne"
  return category.charAt(0).toUpperCase() + category.slice(1)
}

export async function generateMetadata({ params }: any) {

  const { category, letter } = params

  const pretty =
    category === "domace"
      ? "Domaće"
      : category === "strane"
      ? "Strane"
      : "Narodne"

  return {
    title: `${pretty} pesme na slovo ${letter.toUpperCase()} – Akordi i tekstovi`,
    description: `Lista izvođača i pesama na slovo ${letter.toUpperCase()} u kategoriji ${pretty}.`,
  }
}


export default async function CategoryPage(
  { params }: { params: Promise<{ category: string }> }
) {

  const { category } = await params

  const artists = await prisma.artist.findMany({
  where:{ category },
  select:{ name:true }
})

const lettersSet = new Set<string>()

artists.forEach(artist=>{

  if(!artist.name) return
  const name = artist.name.trim().toUpperCase()

  if(name.startsWith("DŽ")) return lettersSet.add("DŽ")
  if(name.startsWith("LJ")) return lettersSet.add("LJ")
  if(name.startsWith("NJ")) return lettersSet.add("NJ")

  const first = name[0]

  if(!/^[A-ZČĆŽŠĐ]/.test(first)){
    lettersSet.add("#")
  }else{
    lettersSet.add(first)
  }

})

const letters = Array.from(lettersSet).sort()

  return (
    <div style={{ padding: "40px", maxWidth: "1000px", margin: "0 auto" }}>

      <h1 style={{ fontSize: "32px", marginBottom: "30px" }}>
        {formatCategory(category)}
      </h1>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>

        {letters.map((letter)=>(
          <Link
            key={letter}
            href={`/pesme/${category}/slovo/${letter.toLowerCase()}`}
            style={{
              padding: "6px 10px",
              border: "1px solid #ccc",
              borderRadius: "6px",
              textDecoration: "none",
              color: "#2563eb",
              fontWeight: 600,
            }}
          >
            {letter}
          </Link>
        ))}

      </div>

    </div>
  )
}