import { homeSongsResponse } from "@/lib/homeSongsServer"

export const revalidate = 3600
export const dynamic = "force-dynamic"
export async function GET() {
  return homeSongsResponse("latest")
}
