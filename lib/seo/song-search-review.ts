import { createHash } from "node:crypto"
import reviews from "./song-search-review-rules.json"
import { routePath } from "./site"

export type SearchReviewSong = { id: string; title: string; slug: string; lyrics: string | null; chords: string | null; artist: { id: string; slug: string; category: string | null } }
type Snapshot = typeof reviews[number]["source"]
export type SongSearchReview = { kind: "incomplete" | "duplicate"; alternativePath: string | null; canonicalPath: string | null }
export const reviewedSongIds = [...new Set(reviews.flatMap(review => [review.source.id, review.target.id]))]
export const songSearchReviewSelect = { id: true, title: true, slug: true, lyrics: true, chords: true, artist: { select: { id: true, slug: true, category: true } } } as const
const fingerprint = (song: SearchReviewSong) => createHash("sha256").update(JSON.stringify([song.lyrics, song.chords])).digest("hex")
function matches(snapshot: Snapshot, song: SearchReviewSong) {
  return snapshot.id === song.id && snapshot.title === song.title && snapshot.slug === song.slug &&
    snapshot.artistId === song.artist.id && snapshot.artistSlug === song.artist.slug && snapshot.category === song.artist.category &&
    snapshot.fingerprint === fingerprint(song)
}
export function songReviewRule(song: SearchReviewSong) {
  return reviews.find(review => review.source.id === song.id && matches(review.source, song)) ?? null
}
export function resolveSongSearchReview(song: SearchReviewSong, candidates: SearchReviewSong[]): SongSearchReview | null {
  const rule = songReviewRule(song)
  if (!rule) return null
  const target = candidates.find(candidate => candidate.id === rule.target.id && matches(rule.target, candidate))
  const path = target?.artist.category ? routePath("pesme", target.artist.category, target.artist.slug, target.slug) : null
  if (rule.kind === "incomplete") return { kind: "incomplete", alternativePath: path, canonicalPath: null }
  if (target && path && fingerprint(target) === fingerprint(song) && target.artist.id === song.artist.id) {
    return { kind: "duplicate", alternativePath: null, canonicalPath: path }
  }
  return null
}
