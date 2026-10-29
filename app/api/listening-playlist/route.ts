import { NextResponse } from "next/server"
import { createMusic, musicBody, musicCatalog, musicFailure, musicViewerId, privateHeaders } from "@/lib/music/server"
import { MusicError, musicCategories } from "@/lib/music/model"

export async function GET(request:Request) {
  try {
    const url=new URL(request.url),userId=await musicViewerId(),publicOnly=url.searchParams.get("scope")==="public"
    if(!publicOnly&&!userId)throw new MusicError(401,"Prijavi se za svoju muziku.")
    const category=url.searchParams.get("category")||undefined
    if(category&&![...musicCategories,"admin"].includes(category))throw new MusicError(400,"Izaberi kategoriju.")
    const page=Math.max(1,Math.min(10000,Number.parseInt(url.searchParams.get("page")||"1",10)||1))
    return NextResponse.json({lists:await musicCatalog({userId:publicOnly?undefined:userId!,viewerId:userId,category,page,limit:publicOnly?50:100})},{headers:privateHeaders})
  }catch(error){return musicFailure(error)}
}
export async function POST(request:Request) {
  try { const playlist=await createMusic(await musicBody(request));return NextResponse.json({playlist},{status:201,headers:privateHeaders}) }
  catch(error){return musicFailure(error)}
}
