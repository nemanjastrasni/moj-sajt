import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(){

const today = new Date().toISOString().slice(0,10)

const data: any = await prisma.$queryRaw`
SELECT visits FROM analytics WHERE day = ${today}
`

return NextResponse.json({count:data[0]?.visits || 0})

}