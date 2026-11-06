import MusicCatalog from "@/app/components/MusicCatalog"
import { cache } from "react"
import { musicCatalog,musicViewerId } from "@/lib/music/server"
import { musicCategories } from "@/lib/music/model"
import { getCategoryLabel } from "@/lib/categories"
import { publicPageMetadata } from "@/lib/seo/metadata"
export const dynamic="force-dynamic"
type Props = {searchParams:Promise<{category?:string;page?:string;top?:string}>}
function catalogQuery(query:Awaited<Props["searchParams"]>){
  const category=typeof query.category==="string"&&[...musicCategories,"admin"].includes(query.category)?query.category:""
  const top=query.top==="1",page=top?1:Math.max(1,Math.min(10000,Number.parseInt(typeof query.page==="string"?query.page:"1",10)||1))
  return {category,page,top}
}
// The liked flags belong to the current viewer: deduplicate within this request only.
const readCatalog=cache(async(category:string,page:number,top:boolean)=>musicCatalog({viewerId:await musicViewerId(),category,page,limit:top?20:50}))
export async function generateMetadata({searchParams}:Props){
  const {category,page,top}=catalogQuery(await searchParams)
  const canonicalQuery:Record<string,string>={}
  if(category)canonicalQuery.category=category
  if(top)canonicalQuery.top="1"
  else if(page>1)canonicalQuery.page=String(page)
  const label=(top?"Top 20 javnih muzičkih lista":"Javne muzičke liste")+(category?" – "+(category==="admin"?"Izbor administratora":getCategoryLabel(category)):"")
  const lists=await readCatalog(category,page,top)
  return {
    ...publicPageMetadata(label+(page>1?" – Strana "+page:""),"Otkrij javne liste za slušanje muzike. Pregledaj zabavnu, narodnu i stranu muziku, miks liste i izbor administratora.","/public-listening-playlists",{canonicalQuery}),
    ...(!lists.length?{robots:{index:false,follow:true}}:{}),
  }
}
export default async function PublicMusic({searchParams}:Props){
  const {category,page,top}=catalogQuery(await searchParams)
  return <MusicCatalog lists={await readCatalog(category,page,top)} owned={false} category={category} page={page} top={top} />
}
