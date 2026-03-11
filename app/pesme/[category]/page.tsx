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

export async function generateMetadata(
  { params }: { params: Promise<{ category: string }> }
): Promise<Metadata> {

  const { category } = await params
  const pretty = formatCategory(category)

  return {
    title: `${pretty} pesme – Akordi i tekstovi`,
    description: `Lista izvođača i pesama u kategoriji ${pretty}.`,
  }
}

export default async function CategoryPage(
  { params }: { params: Promise<{ category: string }> }
) {

  const { category } = await params

  const songs = await prisma.song.findMany({
    where:{ category },
    select:{ title:true }
  })

  const lettersSet = new Set<string>()

  songs.forEach(song=>{

    if(!song.title) return

    const first = song.title[0].toUpperCase()

    if(/[0-9]/.test(first)){
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