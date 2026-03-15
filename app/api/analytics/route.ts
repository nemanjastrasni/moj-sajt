import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(){  
try{

const today = new Date().toISOString().slice(0,10)

await prisma.$executeRaw`
INSERT INTO analytics(day, visits)
VALUES(${today},1)
ON CONFLICT (day)
DO UPDATE SET visits = analytics.visits + 1
`
return NextResponse.json({ ok:true })
}catch{
return NextResponse.json({ ok:false })
}}