import { isFavoriteSetting, type FavoriteSetting } from "./model"

export class FavoriteRequestError extends Error {
  constructor(message: string, public status = 0) { super(message) }
}
export async function favoriteRequest(method: string, body: unknown, signal?: AbortSignal): Promise<{ isFav: boolean; favorite: FavoriteSetting | null }> {
  const controller = new AbortController(), abort = () => controller.abort()
  signal?.addEventListener("abort", abort, { once: true })
  if (signal?.aborted) controller.abort()
  const timer = setTimeout(abort, 15000)
  try {
    const url = method === "GET" ? "/api/favorite/check?songId=" + encodeURIComponent(String(body)) : "/api/favorite"
    const response = await fetch(url, { method, cache: "no-store", keepalive: method === "PATCH", signal: controller.signal, ...(method === "GET" ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) })
    let data
    try { data = await response.json() } catch { throw new FavoriteRequestError("Favoriti trenutno nisu dostupni. Pokusaj ponovo.", response.status) }
    if (!response.ok) throw new FavoriteRequestError(typeof data?.error === "string" ? data.error : "Favoriti trenutno nisu dostupni. Pokusaj ponovo.", response.status)
    if (typeof data?.isFav !== "boolean" || data.isFav !== (data.favorite !== null) || data.favorite !== null && !isFavoriteSetting(data.favorite)) throw new FavoriteRequestError("Podaci o favoritima nisu ispravni. Osvezi stranicu.")
    return data
  } catch (cause) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
    if (controller.signal.aborted) throw new FavoriteRequestError("Cuvanje traje predugo. Proveri sacuvani tonalitet pre ponovnog pokusaja.")
    if (cause instanceof FavoriteRequestError) throw cause
    throw new FavoriteRequestError("Promena nije uspela. Proveri internet vezu.")
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort) }
}
