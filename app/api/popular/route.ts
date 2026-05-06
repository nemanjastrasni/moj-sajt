import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export async function GET() {
const songs = await prisma.song.findMany({
take: 12,
orderBy: {
popularity: "desc",
},
include: {
artist: true,
},
})

return NextResponse.json(songs)
}
