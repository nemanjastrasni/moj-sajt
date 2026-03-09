import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function PlaylistPage({ params }: any) {

const { slug } = params

let songs: any[] = []

if (slug === "4-akorda") {

const allSongs = await prisma.song.findMany({
  include: {
    artist: { select: { slug: true } }
  }
})

songs = allSongs.filter((song) => {

const chords = song.lyrics?.match(/\b[A-G](#|b)?(m|maj|min|sus|dim|aug)?\d*\b/g) || []

const uniqueChords = [...new Set(chords)]

return uniqueChords.length <= 4 && uniqueChords.length > 0

}).slice(0,100)

}
if (slug === "beginner") {

const allSongs = await prisma.song.findMany({
  include: {
    artist: { select: { slug: true } }
  }
})

songs = allSongs.filter((song) => {

const chords = song.lyrics?.match(/\b[A-G](#|b)?(m|maj|min|sus|dim|aug)?\d*\b/g) || []

const uniqueChords = [...new Set(chords)]

const barre = ["F", "Bm", "F#m", "B", "Cm", "Gm"]

return uniqueChords.length > 0 && !uniqueChords.some(c => barre.includes(c))

}).slice(0,100)

}

if (slug === "acoustic") {
  if (slug === "rock") {

songs = await prisma.song.findMany({
  where: {
    category: "strane"
  },
  take: 100,
  orderBy: { title: "asc" },
  include: {
    artist: { select: { slug: true } }
  }
})

}

if (slug === "pop") {

songs = await prisma.song.findMany({
  where: {
    category: "strane"
  },
  take: 100,
  orderBy: { title: "asc" },
  include: {
    artist: { select: { slug: true } }
  }
})

}

if (slug === "narodne") {

songs = await prisma.song.findMany({
  where: {
    category: "narodne"
  },
  take: 100,
  orderBy: { title: "asc" },
  include: {
    artist: { select: { slug: true } }
  }
})

}

const allowed = ["G","C","D","Em","Am"]

const allSongs = await prisma.song.findMany({
  include: {
    artist: { select: { slug: true } }
  }
})

songs = allSongs.filter((song) => {

const chords = song.lyrics?.match(/\b[A-G](#|b)?(m|maj|min|sus|dim|aug)?\d*\b/g) || []

const uniqueChords = [...new Set(chords)]

return uniqueChords.length > 0 && uniqueChords.every(c => allowed.includes(c))

}).slice(0,100)

}

return (
<div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>

<h1>{slug}</h1>

<div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "30px" }}>

{songs.map((song) => (

<Link
key={song.id}
href={`/pesme/${song.category}/${song.artist.slug}/${song.slug}`}
>

{song.title}

</Link>

))}

</div>
</div>
)

}