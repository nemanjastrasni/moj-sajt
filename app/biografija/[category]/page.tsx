import Link from "next/link"
import { prisma } from "@/lib/prisma"

export default async function BioCategory({ params }: any) {

  const { category } = params

  const artists = await prisma.artist.findMany({
    where: { category },
    select: { name: true }
  })

  const lettersSet = new Set<string>()

  artists.forEach((a) => {

    if (!a.name) return

    const first = a.name[0].toUpperCase()

    if (/[0-9]/.test(first)) {
      lettersSet.add("#")
    } else {
      lettersSet.add(first)
    }

  })

  const letters = Array.from(lettersSet).sort()

  const title =
    category === "domace"
      ? "Domaće"
      : category === "strane"
      ? "Strane"
      : "Narodne"

  return (
    <div style={{ padding: "40px" }}>

      <h1
        style={{
          fontSize: "32px",
          marginBottom: "30px",
        }}
      >
        {title}
      </h1>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          maxWidth: "900px",
        }}
      >

        {letters.map((letter) => (
          <Link
            key={letter}
            href={`/biografija/${category}/${letter.toLowerCase()}`}
            style={{
              border: "1px solid #555",
              padding: "8px 12px",
              borderRadius: "6px",
              textDecoration: "none",
            }}
          >
            {letter}
          </Link>
        ))}

      </div>

    </div>
  )
}