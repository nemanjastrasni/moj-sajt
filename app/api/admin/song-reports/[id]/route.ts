import { NextResponse } from "next/server"
import { reportBody, reportFailure, reportUser, reviewSongReport, refreshSongReports } from "@/lib/songReports/server"
import { validateReportReview } from "@/lib/songReports/model"

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const body = await reportBody(request), user = await reportUser(true), { id } = await context.params
    const result = await reviewSongReport(id, user.id, validateReportReview(body))
    refreshSongReports()
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } })
  } catch (error) { return reportFailure(error) }
}
