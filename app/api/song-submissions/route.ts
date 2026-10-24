import { NextResponse } from "next/server"
import { createSubmission, submissionBody, submissionFailure, submissionUser } from "@/lib/submissions/server"
import { validateSubmission } from "@/lib/submissions/validation"

export async function POST(request: Request) {
  try {
    const body = await submissionBody(request)
    const user = await submissionUser()
    const result = await createSubmission(user.id, validateSubmission(body))
    return NextResponse.json(result, { status: 201 })
  } catch (error) { return submissionFailure(error) }
}
