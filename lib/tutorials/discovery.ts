import { decodeHTML } from "entities"
import { SubmissionError } from "../submissions/validation"
import { readLimitedJson } from "../auth/request"
import type { TutorialCandidate } from "./candidates"

const normalize = (value: string) => value.toLowerCase().replace(/đ/g, "dj").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim()
const text = (value: unknown, limit: number) => typeof value === "string" ? decodeHTML(value).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit) : ""
const terms = (value: string) => normalize(value).split(" ").filter(Boolean)
const contains = (haystack: string, tokens: string[]) => tokens.length > 0 && tokens.every(token => (` ${haystack} `).includes(` ${token} `))
export function tutorialQuery(title: string, artist: string) {
  // Catalog text is literal text, not YouTube's Boolean query syntax.
  const clean = (value: string) => text(value, 150).replace(/["|\-]/g, " ").replace(/\s+/g, " ").trim()
  return `${clean(artist)} ${clean(title)} guitar tutorial akordi`.slice(0, 400)
}
export function tutorialCandidates(value: unknown, title: string, artist: string): TutorialCandidate[] {
  const items = value && typeof value === "object" && "items" in value ? value.items : null
  if (!Array.isArray(items)) throw Error("Invalid YouTube response")
  const seen = new Set<string>(), result: (TutorialCandidate & { score: number })[] = []
  for (const item of items.slice(0, 8)) {
    const videoId = item?.id?.videoId, snippet = item?.snippet
    if (typeof videoId !== "string" || !/^[\w-]{11}$/.test(videoId) || seen.has(videoId) || !snippet || snippet.liveBroadcastContent === "live" || snippet.liveBroadcastContent === "upcoming") continue
    const name = text(snippet.title, 120), channel = text(snippet.channelTitle, 120)
    const heading = normalize(name), metadata = normalize(`${name} ${text(snippet.description, 2000)}`)
    // Metadata suggests a lesson; an administrator must still watch and approve it.
    if (!name || !contains(heading, terms(title)) || !contains(metadata, terms(artist)) ||
      !/\b(tutorial|lesson|lessons|lekcija|lekcije|akordi|chords|how to play|kako se svira|kako svirati)\b/.test(metadata) ||
      !/\b(guitar|gitara|gitari|gitaru|akordi|chords)\b/.test(metadata)) continue
    seen.add(videoId)
    result.push({ videoId, title: name, channel, score: (contains(heading, terms(artist)) ? 2 : 0) + (/\b(tutorial|lesson|lekcija|kako)\b/.test(heading) ? 1 : 0) })
  }
  return result.sort((a, b) => b.score - a.score).slice(0, 3).map(({ videoId, title, channel }) => ({ videoId, title, channel }))
}

// Best-effort, bounded per-process controls. Google's project quota remains authoritative.
export function createTutorialDiscovery() {
  const cache = new Map<string, { expires: number; candidates: TutorialCandidate[] }>()
  const pending = new Map<string, Promise<TutorialCandidate[]>>()
  const actors = new Map<string, number>()
  let day = "", searches = 0
  return async (title: string, artist: string, actorId: string) => {
    const query = tutorialQuery(title, artist), key = JSON.stringify([title, artist]), now = Date.now()
    const apiKey = process.env.YOUTUBE_API_KEY?.trim()
    if (!apiKey) return { query, available: false, candidates: [] }
    const cached = cache.get(key)
    if (cached && cached.expires > now) return { query, available: true, candidates: cached.candidates }
    const existing = pending.get(key)
    if (existing) return { query, available: true, candidates: await existing }
    if (now - (actors.get(actorId) ?? 0) < 30000) throw new SubmissionError(429, "Sačekaj pola minuta pre pretrage druge pesme.")
    const today = new Date(now).toISOString().slice(0, 10)
    if (today !== day) { day = today; searches = 0 }
    if (searches >= 40 || pending.size >= 3) throw new SubmissionError(429, "Pretraga predloga je trenutno ograničena. Koristi direktnu YouTube pretragu ili pokušaj kasnije.")
    actors.set(actorId, now); searches++
    if (actors.size > 500) actors.delete(actors.keys().next().value!)
    const work = (async () => {
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 8000)
      try {
        const url = new URL("https://www.googleapis.com/youtube/v3/search")
        url.search = new URLSearchParams({ key: apiKey, part: "snippet", type: "video", maxResults: "8", q: query,
          videoEmbeddable: "true", videoSyndicated: "true", fields: "items(id/videoId,snippet(title,description,channelTitle,liveBroadcastContent))" }).toString()
        const response = await fetch(url, { signal: controller.signal, cache: "no-store", redirect: "error" })
        if (!response.ok) throw Error("YouTube unavailable")
        const candidates = tutorialCandidates(await readLimitedJson(response, 100000), title, artist)
        if (cache.size >= 200) cache.delete(cache.keys().next().value!)
        cache.set(key, { expires: Date.now() + 60 * 60 * 1000, candidates })
        return candidates
      } catch {
        throw new SubmissionError(503, "YouTube predlozi trenutno nisu dostupni. Otvori direktnu pretragu ili unesi link ručno.")
      } finally { clearTimeout(timer) }
    })()
    pending.set(key, work)
    try { return { query, available: true, candidates: await work } }
    finally { pending.delete(key) }
  }
}
export const discoverTutorials = createTutorialDiscovery()
