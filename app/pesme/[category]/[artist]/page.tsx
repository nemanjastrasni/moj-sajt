import UiText from "@/app/components/UiText"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import ArtistHeader from "@/app/components/ArtistHeader"
import { getArtistImage } from "@/lib/artistPhotos"
import styles from "@/app/components/ArtistMedia.module.css"

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
  const image = getArtistImage(artistData)

  return (
    <div className={styles.page}>
      <ArtistHeader name={artistData.name} image={image} />

      {/* LINK KA BIOGRAFIJI */}
      <div style={{ marginBottom: "25px" }}>
        <Link
          href={`/biografija/${category}/${artistData.slug}`}
          style={{ color: "#2563eb", fontWeight: 600 }}
        >
          <UiText text="Pogledaj biografiju" />
        </Link>
      </div>

      {artistData.songs.length === 0 && <p><UiText text="Nema pesama." /></p>}

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
 
  )
}
