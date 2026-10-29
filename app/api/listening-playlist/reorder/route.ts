import { NextResponse } from "next/server"
import { musicBody, musicFailure, mutateMusic, privateHeaders } from "@/lib/music/server"
import { MusicError, musicId } from "@/lib/music/model"
export async function PUT(request:Request) {
  try{
    const input=await musicBody(request)
    if(!musicId(input.playlistId))throw new MusicError(400,"Izaberi muzicku listu.")
    return NextResponse.json({playlist:await mutateMusic(input.playlistId,input,"reorder")},{headers:privateHeaders})
  }catch(error){return musicFailure(error)}
}
