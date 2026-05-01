import Link from "next/link"
import { prisma } from "@/lib/prisma"

export default async function ArtistsByLetter({ params }: { params: Promise<{ category: string; slovo: string }> }){

    function normalizeLetter(letter: string) {
  return decodeURIComponent(letter).toUpperCase()
}

function getFirstLetter(name?: string) {
  if (!name) return ""
  return name.trim().toUpperCase()[0]
}

const { category, slovo } = await params
const letter = normalizeLetter(slovo)
const isSpecial = letter === "#" || letter === "NUM"

let artists = []

if (isSpecial) {
  const all = await prisma.artist.findMany({
    where: { category },
    orderBy: { name: "asc" }
  })

  artists = all.filter(a => {
    const first = a.name?.[0]?.toUpperCase()
    return first && !/^[A-ZČĆŠĐŽ]/.test(first)
  })

} else {

artists = await prisma.artist.findMany({
where:{
category,
name:{
startsWith: letter,
mode: "insensitive"
}
},
orderBy:{ name:"asc" }
})

}

return(

<div style={{padding:"40px"}}>

<h1 style={{fontSize:"28px",marginBottom:"20px"}}>
Izvođači - {letter?.toUpperCase()}
</h1>

<div style={{display:"grid",gap:"8px"}}>

{artists?.map(a=>(
<Link
key={a.id}
href={`/biografija/${category}/${a.slug}`}
>

{a.name}

</Link>
))}

</div>

</div>

)

}