import Link from "next/link"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

function formatCategory(category: string) {
  if (category === "domace") return "Domaće"
  if (category === "strane") return "Strane"
  if (category === "narodne") return "Narodne"
  return category.charAt(0).toUpperCase() + category.slice(1)
}

export async function generateMetadata(
  { params }: any
): Promise<Metadata> {
  const { category } = await params
  const pretty = formatCategory(category)

  return {
    title: `${pretty} pesme – Akordi i tekstovi`,
    description: `Lista izvođača i pesama u kategoriji ${pretty}.`,
  }
}

export default async function CategoryPage({ params }: any) {
  const { category } = await params

  const SR_LATIN = [
    "A","B","C","Č","Ć","D","DŽ","Đ","E","F","G","H",
    "I","J","K","L","LJ","M","N","NJ","O","P","R",
    "S","Š","T","U","V","Z","Ž"
  ]

  return (
    <div style={{ padding: "40px", maxWidth: "1000px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "32px", marginBottom: "30px" }}>
        {formatCategory(category)}
      </h1>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {SR_LATIN.map((letter) => (
          <Link
            key={letter}
            href={`/pesme/${category}/slovo/${letter}`}
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