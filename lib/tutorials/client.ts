import { isTutorialSnapshot, tutorialInput } from "./model"
export async function tutorialRequest(songId: string, method = "GET", body?: unknown, signal?: AbortSignal) {
  const controller = new AbortController(), abort = () => controller.abort(), timer = setTimeout(abort, 15000)
  signal?.addEventListener("abort", abort, { once: true }); if (signal?.aborted) controller.abort()
  try {
    const response = await fetch(`/api/songs/${encodeURIComponent(songId)}/tutorial`, { method, credentials: "same-origin", cache: "no-store", signal: controller.signal, ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) })
    const value = await response.json().catch(() => { throw Error("Tutorijali trenutno nisu dostupni. Poku\u0161aj ponovo.") })
    if (!response.ok) throw Error(typeof value.error === "string" ? value.error : "Tutorijali trenutno nisu dostupni. Poku\u0161aj ponovo.")
    if (!isTutorialSnapshot(value, songId)) throw Error("Odgovor nije potvr\u0111en. U\u010ditaj sa\u010duvani tutorijal.")
    if (method === "PUT" || method === "DELETE") {
      const input = tutorialInput(body, method === "DELETE")
      if (!value.editable || method === "DELETE" && value.tutorial !== null || method === "PUT" && (!value.tutorial || value.tutorial.videoId !== input.videoId || value.tutorial.title !== input.title || value.tutorial.version === input.expectedVersion)) throw Error("Odgovor nije potvr\u0111en. U\u010ditaj sa\u010duvani tutorijal.")
    }
    return value
  } catch (cause) {
    if (controller.signal.aborted && !signal?.aborted) throw Error("Zahtev traje predugo. U\u010ditaj sa\u010duvani tutorijal pre ponovnog poku\u0161aja.")
    if (cause instanceof TypeError) throw Error("Promena nije uspela. Proveri internet vezu.")
    throw cause
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort) }
}
