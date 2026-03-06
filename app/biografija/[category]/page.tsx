import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function CategoryPage({ params }: any) {
  const category = params.category

  const artists = await prisma.artist.findMany({
  where: {
    category,
    bio: { not: null }
  },
  orderBy: { name: "asc" }
})

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
      
      <h1 style={{ fontSize: "32px", marginBottom: "30px" }}>
        Izvođači
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {artists.map((artist) => (
          <Link
            key={artist.id}
            href={`/biografija/${category}/${artist.slug}`}
            style={{ fontSize: "18px" }}
          >
            {artist.name}
          </Link>
        ))}
      </div>

    </div>
  )
}