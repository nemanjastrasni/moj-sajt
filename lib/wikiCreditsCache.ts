import { revalidatePath, revalidateTag } from "next/cache"

export const WIKI_CREDITS_TAG = "public-wiki-credits"

// Writes have already committed. Attempt both invalidations without reporting
// a saved content change as failed if cache infrastructure is unavailable.
export function refreshWikiCredits() {
  try { revalidateTag(WIKI_CREDITS_TAG) }
  catch { console.warn("Wiki credits data cache invalidation failed.") }
  try { revalidatePath("/wiki-izvori") }
  catch { console.warn("Wiki credits page cache invalidation failed.") }
}
