import { NextResponse } from "next/server"
import { submissionUser } from "@/lib/submissions/server"
import { SubmissionError } from "@/lib/submissions/errors"
import { readLimitedJson, RequestBodyError } from "@/lib/auth/request"
import { isSameOrigin } from "@/lib/auth/origin.cjs"
import { preference, savePreference } from "@/lib/engagement/server"
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" }
function failure(error: unknown) {
  return NextResponse.json({error:"Podešavanje statistike trenutno nije dostupno."},{status:error instanceof SubmissionError||error instanceof RequestBodyError?error.status:503,headers})
}
export async function GET() {
  try { const user=await submissionUser();return NextResponse.json(await preference(user.id),{headers}) } catch(error){return failure(error)}
}
export async function PUT(request: Request) {
  try {
    if(!isSameOrigin(request))return NextResponse.json({error:"Nije dozvoljeno."},{status:403,headers})
    if(!request.headers.get("content-type")?.startsWith("application/json"))return NextResponse.json({error:"Neispravni podaci."},{status:415,headers})
    const user=await submissionUser(),body=await readLimitedJson(request,256)
    if(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).length!==1||!("enabled" in body)||typeof body.enabled!=="boolean")return NextResponse.json({error:"Neispravni podaci."},{status:400,headers})
    const current=await preference(user.id)
    if(!current.eligible)return NextResponse.json({error:"Administratorski nalozi se ne mere."},{status:403,headers})
    await savePreference(user.id,body.enabled)
    return NextResponse.json({eligible:true,enabled:body.enabled},{headers})
  }catch(error){return failure(error)}
}
