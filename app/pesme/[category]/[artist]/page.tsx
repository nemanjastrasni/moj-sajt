import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: any) {
  const { category, artist } = await params
 
  const artistData = await prisma.artist.findFirst({
    where: {
      slug: artist,
      category,
    },
  })
  
  if (!artistData) {
    return { title: "Izvođač nije pronađen" }
  }
  
  return {
    title: `${artistData.name} – Pesme`,
  }
}

export default async function ArtistPage({ params }: any) {
  const { category, artist } = params

  const artistData = await prisma.artist.findFirst({
    where: {
      slug: artist,
      category,
    },
    include: {
  songs: {
  select: {
    id: true,
    slug: true,
    title: true,
    chords: true,
    lyrics: true,
    difficulty: true,
  },
  orderBy: { title: "asc" },
},
},
  })

  if (!artistData) notFound()
    const allImages = await prisma.artist.findMany({
  where: { category },
  select: { image: true },
})

const images = allImages
  .map((a) => a.image)
  .filter((img: string | null): img is string => Boolean(img))
  .sort(() => Math.random() - 0.5)
  .slice(0, 3)

  return (
  <div className="relative min-h-screen"
    style={{
  backgroundImage: artistData.image
    ? `url(${artistData.image})`
    : "none",
  backgroundSize: "300px",
  backgroundRepeat: "repeat",
  backgroundPosition: "top left",
}}
  >
    <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-black/95" />

    <div
      style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}
      className="relative z-10"
    >
      <h1 style={{ fontSize: "28px", marginBottom: "10px" }}>
        {artistData.name}
      </h1>

      {/* LINK KA BIOGRAFIJI */}
      <div style={{ marginBottom: "25px" }}>
        <Link
          href={`/biografija/${category}/${artistData.slug}`}
          style={{ color: "#2563eb", fontWeight: 600 }}
        >
          Pogledaj biografiju
        </Link>
      </div>

      {artistData.songs.length === 0 && <p>Nema pesama.</p>}

      <div style={{ display: "grid", gap: "8px" }}>
        {artistData.songs.map((song) => (
          <Link
            key={song.id}
            href={`/pesme/${category}/${artist}/${song.slug}`}
          >
{/\b[A-G](#|b)?(m|maj|min|sus|dim|aug)?\d*\b/.test(song.lyrics)
  ? "🎸 "
  : "🎵 "}
{song.title}
<span style={{ opacity: 0.7, marginLeft: "8px", fontSize: "14px" }}>
  • {song.difficulty}
</span>
</Link>
))
}
</div>
</div>
    </div>
 
  )
}