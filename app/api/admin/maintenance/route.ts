import { NextResponse } from "next/server"
import { adminSongBody,adminSongFailure,requireSongAdmin } from "@/lib/adminSongs/server"
import { contentAction,readProposals } from "@/lib/monitoring/actions"
export const maxDuration=60
export async function GET(request:Request){try{const findingId=new URL(request.url).searchParams.get("findingId");return NextResponse.json(await readProposals(findingId||undefined),{headers:{"Cache-Control":"private, no-store"}})}catch(error){return adminSongFailure(error)}}
export async function POST(request:Request){try{const actor=await requireSongAdmin(),input=await adminSongBody(request);if(!input||typeof input!=="object"||Array.isArray(input))return NextResponse.json({error:"Neispravni podaci."},{status:400});return NextResponse.json({proposal:await contentAction(actor.id,input as Record<string,unknown>)},{headers:{"Cache-Control":"private, no-store"}})}catch(error){return adminSongFailure(error)}}
