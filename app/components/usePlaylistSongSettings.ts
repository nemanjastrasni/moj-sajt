"use client"
import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { currentLocale, translate } from "@/lib/i18n"
import { playingRequest } from "@/lib/playlists/settingsClient"
import { createPlayingSettingsSession, type PlayingSettingsView } from "@/lib/playlists/settingsSession"

type Runtime = { scope: string; settings: ReturnType<typeof createPlayingSettingsSession> }
type View = PlayingSettingsView & { scope: string }
const initialView = (scope: string, loading: boolean): View => ({ scope, transpose: 0, capo: null, phase: loading ? "loading" : "ready", error: "", saved: null, editable: false, pending: false })

async function prepareLeave(runtime: Runtime, current: () => boolean) {
  if (!runtime.settings.snapshot().pending) return current()
  const saved = await runtime.settings.flush()
  if (!current()) return false
  return saved || window.confirm(translate(currentLocale(), "Odbaciti nesacuvana podesavanja playliste?"))
}

export default function usePlaylistSongSettings(playlistId: string | undefined, songId: string) {
  const { data: session, status } = useSession(), router = useRouter()
  const [retry, setRetry] = useState(0)
  const scope = JSON.stringify([playlistId, songId, status, session?.user?.id, retry])
  const empty = initialView(scope, Boolean(playlistId && songId))
  const [view, setView] = useState<View>(empty), active = useRef<Runtime | null>(null)

  useEffect(() => {
    if (!playlistId || !songId || status === "loading") return
    const runtime: Runtime = {
      scope,
      settings: createPlayingSettingsSession(
        (input, signal) => playingRequest(playlistId, songId, input, signal),
        () => { if (active.current === runtime) setView({ scope, ...runtime.settings.snapshot() }) },
      ),
    }
    active.current = runtime
    void runtime.settings.load()
    const current = () => active.current === runtime
    let navigating = false
    const warn = (event: BeforeUnloadEvent) => {
      if (runtime.settings.snapshot().pending) { event.preventDefault(); event.returnValue = "" }
    }
    const navigate = (event: MouseEvent) => {
      if (!runtime.settings.snapshot().pending && !navigating) return
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null
      if (!(anchor instanceof HTMLAnchorElement) || anchor.download || anchor.target && anchor.target !== "_self") return
      const url = new URL(anchor.href)
      if (!["http:", "https:"].includes(url.protocol) || url.href === window.location.href || url.origin === window.location.origin && url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return
      event.preventDefault(); event.stopImmediatePropagation()
      if (navigating) return
      navigating = true
      void prepareLeave(runtime, current).then(allowed => {
        if (!allowed) return
        if (url.origin === window.location.origin) router.push(url.pathname + url.search + url.hash)
        else window.location.assign(url.href)
      }).finally(() => { navigating = false })
    }
    window.addEventListener("beforeunload", warn); document.addEventListener("click", navigate, true)
    return () => {
      window.removeEventListener("beforeunload", warn); document.removeEventListener("click", navigate, true)
      runtime.settings.dispose()
      if (active.current === runtime) active.current = null
    }
  }, [scope, playlistId, songId, status, router])

  const current = view.scope === scope ? view : empty
  async function canLeave() {
    const runtime = active.current
    if (!runtime || runtime.scope !== scope) return !playlistId
    return prepareLeave(runtime, () => active.current === runtime && runtime.scope === scope)
  }
  return {
    ...current,
    controlsDisabled: current.phase === "loading" || current.phase === "error",
    change: (next: number | ((value: number) => number)) => {
      const runtime = active.current
      if (!runtime || runtime.scope !== scope) return
      const value = runtime.settings.snapshot()
      runtime.settings.change({ transpose: typeof next === "function" ? next(value.transpose) : next, capo: value.capo })
    },
    changeCapo: (capo: number | null) => {
      const runtime = active.current
      if (!runtime || runtime.scope !== scope) return
      runtime.settings.change({ transpose: runtime.settings.snapshot().transpose, capo })
    },
    canLeave,
    reload: async () => { if (await canLeave()) setRetry(value => value + 1) },
  }
}
export type PlaylistPlayingControls = ReturnType<typeof usePlaylistSongSettings>
