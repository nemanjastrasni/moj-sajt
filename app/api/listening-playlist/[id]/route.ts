import { NextResponse } from "next/server"
import { musicBody, musicFailure, musicViewerId, mutateMusic, privateHeaders, readableMusic } from "@/lib/music/server"
type Context={params:Promise<{id:string}>}
export async function GET(_request:Request,{params}:Context) {
  try{return NextResponse.json({playlist:await readableMusic((await params).id,await musicViewerId())},{headers:privateHeaders})}catch(error){return musicFailure(error)}
}
export async function PATCH(request:Request,{params}:Context) {
  try{return NextResponse.json({playlist:await mutateMusic((await params).id,await musicBody(request),"edit")},{headers:privateHeaders})}catch(error){return musicFailure(error)}
}
export async function DELETE(request:Request,{params}:Context) {
  try{await mutateMusic((await params).id,await musicBody(request),"delete");return NextResponse.json({ok:true},{headers:privateHeaders})}catch(error){return musicFailure(error)}
}
