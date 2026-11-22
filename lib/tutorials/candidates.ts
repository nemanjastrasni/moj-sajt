export type TutorialCandidate = { videoId: string; title: string; channel: string }
export type TutorialCandidates = { songId: string; query: string; available: boolean; candidates: TutorialCandidate[] }
export const candidateSearchUrl = (query: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
export function isTutorialCandidates(value: unknown, songId: string): value is TutorialCandidates {
  if (!value || typeof value !== "object") return false
  const data = value as TutorialCandidates
  return data.songId === songId && typeof data.query === "string" && data.query.length <= 400 && typeof data.available === "boolean" &&
    Array.isArray(data.candidates) && data.candidates.length <= 3 && data.candidates.every(item => item && typeof item.videoId === "string" && /^[\w-]{11}$/.test(item.videoId) &&
      typeof item.title === "string" && item.title.length > 0 && item.title.length <= 120 && typeof item.channel === "string" && item.channel.length <= 120)
}
