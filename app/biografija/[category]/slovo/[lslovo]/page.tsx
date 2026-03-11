import Link from "next/link"
import { prisma } from "@/lib/prisma"

export default async function ArtistsByLetter({ params }: any){

const { category, slovo } = params
const letter = slovo

let artists

if(letter === "#"){

artists = await prisma.artist.findMany({
where:{
category,
name:{
gte:"0",
lte:"9"
}
},
orderBy:{ name:"asc" }
})

}else{

artists = await prisma.artist.findMany({
where:{
category,
name:{
startsWith: letter,
mode:"insensitive"
}
},
orderBy:{ name:"asc" }
})

}

return(

<div style={{padding:"40px"}}>

<h1 style={{fontSize:"28px",marginBottom:"20px"}}>
Izvođači - {letter.toUpperCase()}
</h1>

<div style={{display:"grid",gap:"8px"}}>

{artists.map(a=>(
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