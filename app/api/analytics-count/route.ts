import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(){

try{

const today = new Date().toISOString().slice(0,10)

const data: any = await prisma.$queryRaw`
SELECT visits FROM analytics WHERE day = ${today}
`

const count = Array.isArray(data) && data.length > 0 ? data[0].visits : 0

return NextResponse.json({ count })

}catch{

return NextResponse.json({ count:0 })

}

}