import { NextResponse } from "next/server"
import { musicBody, musicFailure, privateHeaders, removeMusicItem } from "@/lib/music/server"
type Context={params:Promise<{id:string}>}
export async function DELETE(request:Request,{params}:Context) {
  try{return NextResponse.json({playlist:await removeMusicItem((await params).id,await musicBody(request))},{headers:privateHeaders})}catch(error){return musicFailure(error)}
}
export const POST=DELETE
