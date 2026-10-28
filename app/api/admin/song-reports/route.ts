import { NextResponse } from "next/server"
import { listSongReports, reportFailure } from "@/lib/songReports/server"
import { reportFilters } from "@/lib/songReports/model"

export const dynamic = "force-dynamic"
export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams
    const data = await listSongReports(reportFilters({ status: query.get("status"), kind: query.get("kind"), page: query.get("page") }))
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } })
  } catch (error) { return reportFailure(error) }
}
