import { NextResponse } from "next/server"
import { submissionUser } from "@/lib/submissions/server"
import { SubmissionError } from "@/lib/submissions/errors"
import { readLimitedJson, RequestBodyError } from "@/lib/auth/request"
import { isSameOrigin } from "@/lib/auth/origin.cjs"
import { activityInput } from "@/lib/engagement/model"
import { canRecord, purgeActivity, recordActivity } from "@/lib/engagement/server"
import { prisma } from "@/lib/prisma"
const headers={"Cache-Control":"private, no-store",Vary:"Cookie"}
export async function POST(request: Request) {
  try {
    if(!isSameOrigin(request))return new NextResponse(null,{status:403,headers})
    if(!request.headers.get("content-type")?.startsWith("application/json"))return new NextResponse(null,{status:415,headers})
    const user=await submissionUser(),input=activityInput(await readLimitedJson(request,512))
    if(!input)return new NextResponse(null,{status:400,headers})
    if(!await canRecord(user.id,input))return new NextResponse(null,{status:204,headers})
    await recordActivity(prisma,user.id,input)
    await purgeActivity()
    return new NextResponse(null,{status:204,headers})
  }catch(error){return new NextResponse(null,{status:error instanceof SubmissionError||error instanceof RequestBodyError?error.status:503,headers})}
}
