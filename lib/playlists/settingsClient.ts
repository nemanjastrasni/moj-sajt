import { isPlayingSnapshot, type PlayingSetting } from "./settings"
export async function playingRequest(playlistId: string, songId: string, input?: PlayingSetting, signal?: AbortSignal) {
  const controller = new AbortController(), abort = () => controller.abort()
  signal?.addEventListener("abort", abort, { once: true }); if (signal?.aborted) controller.abort()
  const timer = setTimeout(abort, 15000)
  try {
    const response = await fetch(`/api/playlist/${encodeURIComponent(playlistId)}/songs/${encodeURIComponent(songId)}/settings`, { method: input ? "PATCH" : "GET", cache: "no-store", signal: controller.signal, ...(input ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) } : {}) })
    let data
    try { data = await response.json() } catch { throw Error("Podesavanja nisu potvrdena. Ucitaj sacuvanu verziju.") }
    if (!response.ok) throw Error(typeof data?.error === "string" ? data.error : "Podesavanja nisu potvrdena. Ucitaj sacuvanu verziju.")
    if (!isPlayingSnapshot(data, playlistId, songId)) throw Error("Podesavanja nisu potvrdena. Ucitaj sacuvanu verziju.")
    if (input && (!data.editable || data.setting.entryId !== input.entryId || data.setting.version !== input.version + 1 || data.setting.transpose !== input.transpose || data.setting.capo !== input.capo)) throw Error("Podesavanja nisu potvrdena. Ucitaj sacuvanu verziju.")
    return data
  } catch (cause) {
    if (controller.signal.aborted) throw Error("Zahtev traje predugo. Podesavanja mozda jesu sacuvana; ucitaj sacuvanu verziju.")
    if (cause instanceof TypeError) throw Error("Promena nije uspela. Proveri internet vezu.")
    throw cause
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort) }
}
