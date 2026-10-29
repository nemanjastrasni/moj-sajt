import { NextResponse } from "next/server"
import { musicBody, musicFailure, mutateMusic, privateHeaders, removeMusicItem } from "@/lib/music/server"
import { MusicError, musicId } from "@/lib/music/model"
export async function POST(request:Request) {
  try{
    const input=await musicBody(request)
    if(!musicId(input.playlistId))throw new MusicError(400,"Izaberi muzicku listu.")
    return NextResponse.json({playlist:await mutateMusic(input.playlistId,input,"add")},{status:201,headers:privateHeaders})
  }catch(error){return musicFailure(error)}
}
export async function DELETE(request:Request) {
  try{
    const input=await musicBody(request)
    if(!musicId(input.itemId))throw new MusicError(400,"Izaberi stavku.")
    return NextResponse.json({playlist:await removeMusicItem(input.itemId,input)},{headers:privateHeaders})
  }catch(error){return musicFailure(error)}
}
