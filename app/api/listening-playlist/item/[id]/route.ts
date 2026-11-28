import { NextResponse } from "next/server"
import { musicBody, musicFailure, privateHeaders, removeMusicItem, renameMusicItem } from "@/lib/music/server"
type Context={params:Promise<{id:string}>}
export async function DELETE(request:Request,{params}:Context) {
  try{return NextResponse.json({playlist:await removeMusicItem((await params).id,await musicBody(request))},{headers:privateHeaders})}catch(error){return musicFailure(error)}
}
export const POST=DELETE
export async function PATCH(request:Request,{params}:Context) {
  try{return NextResponse.json({playlist:await renameMusicItem((await params).id,await musicBody(request))},{headers:privateHeaders})}catch(error){return musicFailure(error)}
}
