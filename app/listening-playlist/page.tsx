import { redirect } from "next/navigation"
import MusicCatalog from "@/app/components/MusicCatalog"
import { musicCatalog,musicViewerId } from "@/lib/music/server"
export const dynamic="force-dynamic"
export const metadata={title:"Moja muzika",robots:{index:false,follow:false}}
export default async function MusicPage(){
  const userId=await musicViewerId()
  if(!userId)redirect("/login?callbackUrl=%2Flistening-playlist")
  return <MusicCatalog lists={await musicCatalog({userId,limit:100})} owned />
}
