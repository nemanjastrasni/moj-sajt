import { revalidatePath, revalidateTag } from "next/cache"
import { NextResponse } from "next/server"
import { reviewSubmission, submissionBody, submissionFailure, submissionUser } from "@/lib/submissions/server"
import { SubmissionError, validateReview } from "@/lib/submissions/validation"
import { queueArtistWikipedia } from "@/lib/artists/wikipedia"

export const maxDuration = 60

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await submissionBody(request)
    const user = await submissionUser(true)
    const { id } = await params
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw new SubmissionError(400, "Neispravan predlog.")
    const result = await reviewSubmission(id, user.id, validateReview(body))
    // Publication has already committed; a cache failure must not report a failed approval.
    try { revalidateTag("playlist-catalog") } catch {}
    try { revalidatePath("/pesme", "layout"); revalidatePath("/"); revalidatePath("/admin/predlozi"); revalidatePath("/moji-predlozi") } catch {}
    if (result.artistId) queueArtistWikipedia(result.artistId)
    return NextResponse.json({ href: result.href })
  } catch (error) { return submissionFailure(error) }
}
