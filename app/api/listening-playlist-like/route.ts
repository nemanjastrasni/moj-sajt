import { NextResponse } from "next/server"
import { submissionUser } from "@/lib/submissions/server"
import { playlistTransaction } from "@/lib/playlists/server"
import { musicBody, musicFailure, privateHeaders } from "@/lib/music/server"
import { MusicError, musicId } from "@/lib/music/model"
export async function POST(request:Request) {
  try{
    const input=await musicBody(request),actor=await submissionUser()
    if(!musicId(input.playlistId))throw new MusicError(400,"Izaberi muzicku listu.")
    const playlistId=input.playlistId
    const liked=await playlistTransaction(async tx=>{
      const current=await tx.user.findUnique({where:{id:actor.id},select:{banned:true}})
      if(!current||current.banned)throw new MusicError(403,"Pristup nije dozvoljen.")
      const list=await tx.listeningPlaylist.findFirst({where:{id:playlistId,isPublic:true},select:{id:true}})
      if(!list)throw new MusicError(404,"Muzicka lista nije dostupna.")
      const where={userId_playlistId:{userId:actor.id,playlistId}}
      const previous=await tx.listeningPlaylistLike.findUnique({where})
      if(previous){await tx.listeningPlaylistLike.delete({where});return false}
      await tx.listeningPlaylistLike.create({data:{userId:actor.id,playlistId}});return true
    })
    return NextResponse.json({liked},{headers:privateHeaders})
  }catch(error){return musicFailure(error)}
}
