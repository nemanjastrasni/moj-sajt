import { isCapo } from "../chords/capo"
import { SubmissionError } from "../submissions/validation"

export type PlayingValues = { transpose: number; capo: number | null }
export type PlayingSetting = PlayingValues & { entryId: string; version: number }
export type PlayingSnapshot = { playlistId: string; songId: string; editable: boolean; setting: PlayingSetting }
const id = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value)
const version = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 2147483647
export function isPlayingValues(value: unknown): value is PlayingValues {
  if (!value || typeof value !== "object") return false
  const data = value as PlayingValues
  return Number.isInteger(data.transpose) && data.transpose >= -11 && data.transpose <= 11 && (data.capo === null || isCapo(data.capo))
}
export function playingValues(value: unknown): PlayingValues {
  if (!isPlayingValues(value)) throw new SubmissionError(400, "Proveri tonalitet i capo.")
  return { transpose: value.transpose, capo: value.capo }
}
export function playingUpdate(value: unknown) {
  const values = playingValues(value), data = value as PlayingSetting
  if (!id(data.entryId) || !version(data.version) || data.version === 2147483647) throw new SubmissionError(400, "Osvezi podesavanja playliste.")
  return { ...values, entryId: data.entryId, version: data.version }
}
export function isPlayingSnapshot(value: unknown, playlistId: string, songId: string): value is PlayingSnapshot {
  if (!value || typeof value !== "object") return false
  const data = value as PlayingSnapshot
  return data.playlistId === playlistId && data.songId === songId && typeof data.editable === "boolean" && isPlayingValues(data.setting) && id(data.setting.entryId) && version(data.setting.version)
}
export function samePlayingValues(a: PlayingValues, b: PlayingValues) { return a.transpose === b.transpose && a.capo === b.capo }
