import { playingValues, samePlayingValues, type PlayingSetting, type PlayingSnapshot, type PlayingValues } from "./settings"

export type PlayingSettingsView = PlayingValues & {
  phase: "loading" | "ready" | "saving" | "saved" | "error"
  error: string
  saved: PlayingSetting | null
  editable: boolean
  pending: boolean
}

type Request = (input: PlayingSetting | undefined, signal: AbortSignal) => Promise<PlayingSnapshot>
const failure = (cause: unknown) => cause instanceof Error ? cause.message : "Podesavanja nisu potvrdena. Ucitaj sacuvanu verziju."

export function createPlayingSettingsSession(request: Request, changed: () => void) {
  const state: Omit<PlayingSettingsView, "pending"> = { transpose: 0, capo: null, phase: "loading", error: "", saved: null, editable: false }
  const controller = new AbortController()
  let disposed = false, writing: Promise<boolean> | null = null
  const pending = () => Boolean(state.editable && state.saved && (writing || state.phase === "error" || !samePlayingValues(state, state.saved)))
  const snapshot = (): PlayingSettingsView => ({ ...state, saved: state.saved ? { ...state.saved } : null, pending: pending() })
  const publish = () => { if (!disposed) changed() }

  async function load() {
    try {
      const data = await request(undefined, controller.signal)
      if (disposed) return
      Object.assign(state, { transpose: data.setting.transpose, capo: data.setting.capo, saved: { ...data.setting }, editable: data.editable, phase: "ready", error: "" })
    } catch (cause) {
      if (disposed) return
      state.phase = "error"; state.error = failure(cause)
    }
    publish()
  }

  function flush(): Promise<boolean> {
    if (disposed) return Promise.resolve(false)
    if (writing) return writing
    if (!pending()) return Promise.resolve(true)
    if (state.phase === "error") return Promise.resolve(false)

    // Serialize writes against the last acknowledged version, keeping newer previews intact.
    writing = Promise.resolve().then(async () => {
      let saved = false
      try {
        while (!disposed && state.saved && !samePlayingValues(state, state.saved)) {
          const input: PlayingSetting = { ...playingValues(state), entryId: state.saved.entryId, version: state.saved.version }
          const data = await request(input, controller.signal)
          if (disposed) return false
          state.saved = { ...data.setting }; saved = true
        }
        if (disposed) return false
        state.phase = saved ? "saved" : "ready"
        return true
      } catch (cause) {
        if (!disposed) { state.phase = "error"; state.error = failure(cause) }
        return false
      } finally {
        writing = null
        publish()
      }
    })
    state.phase = "saving"; state.error = ""; publish()
    return writing
  }

  function change(values: PlayingValues) {
    if (disposed || state.phase === "loading" || state.phase === "error") return
    Object.assign(state, playingValues(values))
    state.phase = pending() ? "saving" : "ready"
    publish()
    if (state.editable) void flush()
  }

  return {
    snapshot, load, change, flush,
    dispose() { disposed = true; controller.abort() },
  }
}
