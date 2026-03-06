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
  const { category, artist } = await params

  const artistData = await prisma.artist.findFirst({
    where: {
      slug: artist,
      category,
    },
    include: {
      songs: {
        orderBy: { title: "asc" },
      },
    },
  })

  if (!artistData) notFound()

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
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
           <span
  style={{
    marginRight: "6px",
    color: song.chords && song.chords.length > 0 ? "#2563eb" : "#9ca3af"
  }}
>
  {song.chords && song.chords.length > 0 ? "🎸" : "🎵"}
</span>
{song.title}
          </Link>
        ))}
      </div>
    </div>
  )
}