"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { favoriteRequest } from "@/lib/favorites/client"
import { favoriteTranspose, type FavoriteSetting } from "@/lib/favorites/model"

type Phase = "loading" | "ready" | "saving" | "saved" | "updating" | "error"
type View = { scope: string; transpose: number; favorite: FavoriteSetting | null; phase: Phase; error: string }
type Runtime = View & { pending: number | null; running: boolean; blocked: boolean }
const message = (cause: unknown) => cause instanceof Error ? cause.message : "Promena nije uspela. Proveri internet vezu."

export default function useFavoriteSong(songId: string, fromFavorites: boolean) {
  const { data: session, status } = useSession(), router = useRouter()
  const scope = JSON.stringify([songId, fromFavorites, status, session?.user?.id])
  const active = useRef<Runtime | null>(null)
  const empty: View = { scope, transpose: 0, favorite: null, phase: "loading", error: "" }
  const [view, setView] = useState<View>(empty)
  function publish(runtime: Runtime) { if (active.current === runtime) setView({ ...runtime }) }
  useEffect(() => {
    const runtime: Runtime = { scope, transpose: 0, favorite: null, phase: status === "unauthenticated" ? "ready" : "loading", error: "", pending: null, running: false, blocked: false }
    const controller = new AbortController()
    active.current = runtime; setView({ ...runtime })
    if (status === "authenticated") {
      void favoriteRequest("GET", songId, controller.signal).then(data => {
        if (active.current !== runtime) return
        runtime.favorite = data.favorite
        // Only an explicit Favorites entry restores the personal key. A direct visit stays original.
        runtime.transpose = fromFavorites ? data.favorite?.transpose ?? 0 : 0
        runtime.phase = "ready"; publish(runtime)
      }).catch(cause => {
        if (controller.signal.aborted || active.current !== runtime) return
        runtime.phase = "error"; runtime.blocked = true; runtime.error = message(cause); publish(runtime)
      })
    }
    return () => { controller.abort(); if (active.current === runtime) active.current = null }
  }, [scope, songId, fromFavorites, status])

  useEffect(() => {
    if (view.scope !== scope || !["saving", "updating"].includes(view.phase)) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [view.scope, view.phase, scope])

  async function flush(runtime: Runtime) {
    if (runtime.running || runtime.blocked || !runtime.favorite) return
    runtime.running = true
    try {
      while (runtime.pending !== null && runtime.favorite && !runtime.blocked) {
        const target = runtime.pending, previous = runtime.favorite
        runtime.pending = null
        if (target !== previous.transpose) {
          const data = await favoriteRequest("PATCH", { songId, favoriteId: previous.id, expectedTranspose: previous.transpose, transpose: target })
          if (!data.favorite || data.favorite.id !== previous.id || data.favorite.transpose !== target) throw Error("Podaci o favoritima nisu ispravni. Osvezi stranicu.")
          runtime.favorite = data.favorite
        }
        runtime.phase = runtime.pending === null ? "saved" : "saving"
        publish(runtime)
      }
    } catch (cause) {
      runtime.pending = runtime.transpose; runtime.blocked = true; runtime.phase = "error"; runtime.error = message(cause); publish(runtime)
    } finally { runtime.running = false }
  }
  function change(next: number | ((current: number) => number)) {
    const runtime = active.current
    if (!runtime || runtime.scope !== scope || ["loading", "updating"].includes(runtime.phase)) return
    const value = favoriteTranspose(typeof next === "function" ? next(runtime.transpose) : next)
    runtime.transpose = value
    if (runtime.favorite && !runtime.blocked) { runtime.pending = value; runtime.phase = "saving"; runtime.error = "" }
    publish(runtime)
    if (runtime.pending !== null) void flush(runtime)
  }
  async function reload() {
    const runtime = active.current
    if (!runtime || runtime.scope !== scope || runtime.running || runtime.phase === "loading") return
    const restore = fromFavorites || runtime.favorite !== null
    runtime.phase = "loading"; runtime.error = ""; publish(runtime)
    try {
      const data = await favoriteRequest("GET", songId)
      if (active.current !== runtime) return
      runtime.favorite = data.favorite; runtime.pending = null; runtime.blocked = false
      runtime.transpose = restore ? data.favorite?.transpose ?? 0 : runtime.transpose
      runtime.phase = "ready"; publish(runtime)
    } catch (cause) { runtime.phase = "error"; runtime.blocked = true; runtime.error = message(cause); publish(runtime) }
  }
  async function toggle() {
    if (status === "unauthenticated") { router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`); return }
    const runtime = active.current
    if (!runtime || runtime.scope !== scope || runtime.running || runtime.blocked || ["loading", "saving", "updating"].includes(runtime.phase)) return
    runtime.phase = "updating"; runtime.error = ""; publish(runtime)
    try {
      const data = await favoriteRequest(runtime.favorite ? "DELETE" : "PUT", { songId, transpose: runtime.transpose, ...(runtime.favorite ? { favoriteId: runtime.favorite.id } : {}) })
      if (active.current !== runtime) return
      runtime.favorite = data.favorite; runtime.phase = data.favorite?.transpose === runtime.transpose ? "saved" : "ready"; publish(runtime)
    } catch (cause) { runtime.phase = "error"; runtime.blocked = true; runtime.error = message(cause); publish(runtime) }
  }
  const current = view.scope === scope ? view : empty
  return { ...current, isFav: Boolean(current.favorite), controlsDisabled: ["loading", "updating"].includes(current.phase), favoriteDisabled: ["loading", "saving", "updating", "error"].includes(current.phase), change, toggle, reload }
}
