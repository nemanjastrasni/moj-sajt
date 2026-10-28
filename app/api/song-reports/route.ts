import { NextResponse } from "next/server"
import { createSongReport, reportBody, reportFailure, reportUser, refreshSongReports } from "@/lib/songReports/server"
import { validateReport } from "@/lib/songReports/model"

export async function POST(request: Request) {
  try {
    const body = await reportBody(request), user = await reportUser()
    const result = await createSongReport(user.id, validateReport(body))
    refreshSongReports()
    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "no-store" } })
  } catch (error) { return reportFailure(error) }
}
