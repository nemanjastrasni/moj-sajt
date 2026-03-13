import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(){

const data: any = await prisma.$queryRaw`
SELECT SUM(visits) as total FROM analytics
`

return NextResponse.json({count:data[0].total || 0})

}