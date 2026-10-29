import { youtubeSource } from "../music/model"
import { SubmissionError } from "../submissions/validation"
export type Tutorial = { videoId: string; title: string; version: string }
export type TutorialSnapshot = { songId: string; editable: boolean; tutorial: Tutorial | null }
const versionPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function tutorialInput(value: unknown, remove = false) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SubmissionError(400, "Neispravni podaci.")
  const data = value as Record<string, unknown>
  if (data.expectedVersion !== null && (typeof data.expectedVersion !== "string" || !versionPattern.test(data.expectedVersion))) throw new SubmissionError(400, "Osve\u017ei tutorijal pre izmene.")
  if (remove) {
    if (data.expectedVersion === null) throw new SubmissionError(400, "Osve\u017ei tutorijal pre izmene.")
    return { expectedVersion: data.expectedVersion, videoId: "", title: "" }
  }
  const source = youtubeSource(data.url)
  if (source?.kind !== "video") throw new SubmissionError(400, "Unesi ispravan HTTPS YouTube video ili Shorts link, ne plejlistu.")
  if (typeof data.title !== "string" || data.title.length > 120 || /[\u0000-\u001f\u007f]/.test(data.title)) throw new SubmissionError(400, "Naziv tutorijala mo\u017ee imati najvi\u0161e 120 znakova.")
  return { expectedVersion: data.expectedVersion as string | null, videoId: source.id, title: data.title.trim() }
}
export function isTutorialSnapshot(value: unknown, songId: string): value is TutorialSnapshot {
  if (!value || typeof value !== "object") return false
  const data = value as TutorialSnapshot
  if (data.songId !== songId || typeof data.editable !== "boolean") return false
  const tutorial = data.tutorial
  return tutorial === null || Boolean(tutorial && /^[\w-]{11}$/.test(tutorial.videoId) && typeof tutorial.title === "string" && tutorial.title.length <= 120 && typeof tutorial.version === "string" && versionPattern.test(tutorial.version))
}
export const tutorialUrl = (videoId: string) => `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
