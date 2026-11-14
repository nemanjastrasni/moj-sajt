import { readLimitedJson, RequestBodyError } from "../auth/request"
import { isSameOrigin } from "../auth/origin.cjs"
import { SubmissionError } from "./errors"

export async function submissionBody(request: Request) {
  if (!isSameOrigin(request)) throw new SubmissionError(403, "Nije dozvoljeno.")
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new SubmissionError(415, "Ocekuju se JSON podaci.")
  try { return await readLimitedJson(request, 200000) }
  catch (error) {
    if (error instanceof RequestBodyError) throw new SubmissionError(error.status, error.status === 413 ? "Predlog je prevelik." : "Neispravni podaci.")
    throw error
  }
}
