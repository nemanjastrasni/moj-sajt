import MusicCatalog from "@/app/components/MusicCatalog"
import { musicCatalog,musicViewerId } from "@/lib/music/server"
import { musicCategories } from "@/lib/music/model"
export const dynamic="force-dynamic"
export const metadata={title:"Javne muzicke liste"}
export default async function PublicMusic({searchParams}:{searchParams:Promise<{category?:string;page?:string;top?:string}>}){
  const query=await searchParams
  const category=[...musicCategories,"admin"].includes(query.category||"")?query.category!:""
  const page=Math.max(1,Math.min(10000,Number.parseInt(query.page||"1",10)||1)),top=query.top==="1"
  return <MusicCatalog lists={await musicCatalog({viewerId:await musicViewerId(),category,page:top?1:page,limit:top?20:50})} owned={false} category={category} page={page} top={top} />
}
