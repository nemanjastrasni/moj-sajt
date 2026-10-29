import { notFound } from "next/navigation"
import MusicPlaylist from "@/app/components/MusicPlaylist"
import { BackNavigationTarget } from "@/app/components/BackNavigation"
import { musicViewerId,readableMusic } from "@/lib/music/server"
import { MusicError } from "@/lib/music/model"
export const dynamic="force-dynamic"
export const metadata={title:"Muzicka lista",robots:{index:false,follow:false}}
export default async function MusicPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params,viewerId=await musicViewerId()
  let playlist
  try{playlist=await readableMusic(id,viewerId)}catch(error){if(error instanceof MusicError&&error.status===404)notFound();throw error}
  return <><BackNavigationTarget pathname={"/listening-playlist/"+encodeURIComponent(id)} href={playlist.editable?"/listening-playlist":"/public-listening-playlists"} /><MusicPlaylist initial={playlist} viewerId={viewerId} /></>
}
