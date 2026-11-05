"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { requireSongAdmin } from "@/lib/adminSongs/server"
import { ADMIN_STATS_TAG } from "@/lib/adminStats/server"

export async function refreshAdminStatistics() {
  await requireSongAdmin()
  revalidateTag(ADMIN_STATS_TAG)
  revalidatePath("/admin")
}
