"use client"
import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { currentLocale, translate } from "@/lib/i18n"
import { playingValues, samePlayingValues, type PlayingSetting, type PlayingValues } from "@/lib/playlists/settings"
import { playingRequest } from "@/lib/playlists/settingsClient"

type View = PlayingValues & { scope: string; phase: "loading" | "ready" | "dirty" | "saving" | "saved" | "error"; error: string; saved: PlayingSetting | null; editable: boolean }
type Runtime = View & { running: boolean; controller: AbortController }
export default function usePlaylistSongSettings(playlistId: string | undefined, songId: string) {
  const { data: session, status } = useSession(), scope = JSON.stringify([playlistId, songId, status, session?.user?.id])
  const empty: View = { scope, transpose: 0, capo: null, phase: playlistId && songId ? "loading" : "ready", error: "", saved: null, editable: false }
  const [view, setView] = useState<View>(empty), [retry, setRetry] = useState(0), active = useRef<Runtime | null>(null)
  function publish(runtime: Runtime) { if (active.current === runtime) setView({ ...runtime }) }
  useEffect(() => {
    const runtime: Runtime = { scope, transpose: 0, capo: null, phase: playlistId && songId ? "loading" : "ready", error: "", saved: null, editable: false, running: false, controller: new AbortController() }
    active.current = runtime; publish(runtime)
    if (playlistId && songId && status !== "loading") void playingRequest(playlistId, songId, undefined, runtime.controller.signal).then(data => {
      if (active.current !== runtime) return
      Object.assign(runtime, { transpose: data.setting.transpose, capo: data.setting.capo, saved: data.setting, editable: data.editable, phase: "ready" }); publish(runtime)
    }).catch(cause => {
      if (active.current !== runtime || runtime.controller.signal.aborted) return
      runtime.phase = "error"; runtime.error = cause instanceof Error ? cause.message : "Podesavanja nisu potvrdena. Ucitaj sacuvanu verziju."; publish(runtime)
    })
    return () => { runtime.controller.abort(); if (active.current === runtime) active.current = null }
  }, [scope, playlistId, songId, status, retry])
  const current = view.scope === scope ? view : empty
  const pending = Boolean(current.editable && current.saved && !samePlayingValues(current, current.saved))
  function canLeave() { return !pending || window.confirm(translate(currentLocale(), "Odbaciti nesacuvana podesavanja playliste?")) }
  useEffect(() => {
    if (!pending) return
    const hasPending = () => { const runtime = active.current; return Boolean(runtime?.scope === scope && runtime.editable && runtime.saved && !samePlayingValues(runtime, runtime.saved)) }
    const warn = (event: BeforeUnloadEvent) => { if (hasPending()) { event.preventDefault(); event.returnValue = "" } }
    const navigate = (event: MouseEvent) => {
      if (!hasPending()) return
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null
      if (!(anchor instanceof HTMLAnchorElement) || anchor.download || anchor.target === "_blank" || anchor.getAttribute("href")?.startsWith("#")) return
      if (!window.confirm(translate(currentLocale(), "Odbaciti nesacuvana podesavanja playliste?"))) { event.preventDefault(); event.stopImmediatePropagation() }
    }
    window.addEventListener("beforeunload", warn); document.addEventListener("click", navigate, true)
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", navigate, true) }
  }, [pending, scope])
  function changeValues(values: PlayingValues) {
    const runtime = active.current
    if (!runtime || runtime.scope !== scope || runtime.phase === "loading" || runtime.phase === "saving" || runtime.phase === "error") return
    Object.assign(runtime, playingValues(values))
    runtime.phase = runtime.editable && runtime.saved && !samePlayingValues(runtime, runtime.saved) ? "dirty" : "ready"
    publish(runtime)
  }
  async function save() {
    const runtime = active.current
    if (!playlistId || !runtime || runtime.scope !== scope || runtime.running || !runtime.editable || !runtime.saved || runtime.phase !== "dirty") return
    const input = { entryId: runtime.saved.entryId, version: runtime.saved.version, transpose: runtime.transpose, capo: runtime.capo }
    runtime.running = true; runtime.phase = "saving"; runtime.error = ""; publish(runtime)
    try {
      const data = await playingRequest(playlistId, songId, input, runtime.controller.signal)
      if (active.current === runtime) { runtime.saved = data.setting; runtime.phase = "saved"; publish(runtime) }
    } catch (cause) {
      if (active.current === runtime && !runtime.controller.signal.aborted) { runtime.phase = "error"; runtime.error = cause instanceof Error ? cause.message : "Podesavanja nisu potvrdena. Ucitaj sacuvanu verziju."; publish(runtime) }
    } finally { runtime.running = false }
  }
  return { ...current, pending, controlsDisabled: current.phase === "loading" || current.phase === "saving" || current.phase === "error",
    change: (next: number | ((value: number) => number)) => { const value = active.current?.scope === scope ? active.current : current; changeValues({ transpose: typeof next === "function" ? next(value.transpose) : next, capo: value.capo }) },
    changeCapo: (capo: number | null) => { const value = active.current?.scope === scope ? active.current : current; changeValues({ transpose: value.transpose, capo }) }, save, canLeave,
    reload: async () => { if (canLeave()) setRetry(value => value + 1) },
  }
}
export type PlaylistPlayingControls = ReturnType<typeof usePlaylistSongSettings>
