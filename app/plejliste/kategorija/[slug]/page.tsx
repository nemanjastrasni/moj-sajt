import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function PlaylistSongsPage({ params }: any) {

const { slug } = params


let songs: any[] = []

const allSongs = await prisma.song.findMany({
where: {},
include: {
artist: { select: { slug: true } }
}
})

if (slug === "4-akorda") {

songs = allSongs.filter((song) => {

const chords = song.chords?.match(/\b[A-G](#|b)?(m|maj|min|sus|dim|aug)?\d*\b/g) || []

const uniqueChords = [...new Set(chords)]

return uniqueChords.length <= 4 && uniqueChords.length > 0

}).slice(0,100)

}
if (slug === "beginner") {

songs = allSongs.filter((song) => {

const chords = song.chords?.match(/\b[A-G](#|b)?(m|maj|min|sus|dim|aug)?\d*\b/g) || []

const uniqueChords = [...new Set(chords)]

const barre = ["F","Bm","F#m","B","Cm","Gm"]

return uniqueChords.length > 0 && !uniqueChords.some(c => barre.includes(c))

}).slice(0,100)

}

if (slug === "acoustic") {

const allowed = ["G","C","D","Em","Am"]

songs = allSongs.filter((song) => {

const chords = song.chords?.match(/\b[A-G](#|b)?(m|maj|min|sus|dim|aug)?\d*\b/g) || []

const uniqueChords = [...new Set(chords)]

return uniqueChords.length > 0 && uniqueChords.every(c => allowed.includes(c))

}).slice(0,100)

}
return (

<div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>

<h1 style={{
fontSize:"26px",
marginBottom:"30px",
color:"#38bdf8",
textTransform:"capitalize"
}}>
{slug.replace("-", " ")}
</h1>

<div style={{ display: "grid", gap: "12px", fontSize:"18px" }}>

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