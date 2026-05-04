import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
const songs = await prisma.song.findMany({
take: 12,
orderBy: {
id: "desc", // privremeno (posle može views)
},
include: {
artist: true,
},
})

return NextResponse.json(songs)
}
