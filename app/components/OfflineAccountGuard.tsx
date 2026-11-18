"use client"
import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { OFFLINE_EVENT, OFFLINE_OWNER, removeOfflineList } from "@/lib/offline/store"
export default function OfflineAccountGuard() {
  const { data: session } = useSession(), id = session?.user?.id
  useEffect(() => {
    try { const owner = localStorage.getItem(OFFLINE_OWNER); if (id && owner && owner !== id) void removeOfflineList().catch(() => {}) } catch {}
  }, [id])
  useEffect(() => {
    const changed = (event: StorageEvent) => { if (event.key?.startsWith("gitarakordi-offline-")) window.dispatchEvent(new Event(OFFLINE_EVENT)) }
    window.addEventListener("storage", changed); return () => window.removeEventListener("storage", changed)
  }, [])
  return null
}
