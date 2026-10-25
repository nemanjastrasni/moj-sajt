import { SubmissionError } from "../submissions/validation"

export type FavoriteSetting = { id: string; transpose: number }
export const FAVORITE_MIN_TRANSPOSE = -11
export const FAVORITE_MAX_TRANSPOSE = 11
export function favoriteTranspose(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < FAVORITE_MIN_TRANSPOSE || (value as number) > FAVORITE_MAX_TRANSPOSE) throw new SubmissionError(400, "Tonalitet mora biti ceo broj od -11 do 11.")
  return value as number
}
export function isFavoriteSetting(value: unknown): value is FavoriteSetting {
  if (!value || typeof value !== "object") return false
  const row = value as Partial<FavoriteSetting>
  return typeof row.id === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(row.id) && Number.isInteger(row.transpose) && row.transpose! >= -11 && row.transpose! <= 11
}
export function favoriteSongHref(song: { category: string; slug: string; artist: { slug: string } }) {
  return "/pesme/" + [song.category, song.artist.slug, song.slug].map(encodeURIComponent).join("/") + "?from=favorites"
}
export function isFavoriteView(query: Record<string, string | string[] | undefined>, playlist: string | null) {
  return query.from === "favorites" && !playlist
}
