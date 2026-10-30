"use client"

import { useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { adminSongRequest } from "@/lib/adminSongs/client"
import { isReviewStatus, reviewLabels, reviewStatuses, type ReviewState, type ReviewStatus } from "@/lib/songReview/model"
import { useI18n } from "./UiText"
import SongReviewBadge from "./SongReviewBadge"
import styles from "./SongReview.module.css"

export default function SongReviewControl({ songId, initial, compact = false }: { songId: string; initial: ReviewState; compact?: boolean }) {
  const { t } = useI18n(), router = useRouter(), id = useId(), running = useRef(false)
  const [status, setStatus] = useState(initial.status), [busy, setBusy] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(false)
  async function change(next: ReviewStatus) {
    if (running.current || status === next) return
    running.current = true; setBusy(true); setError(""); setSaved(false)
    try {
      const result = await adminSongRequest(`/api/admin/songs/${encodeURIComponent(songId)}/review`, "PATCH", { status: next, expectedStatus: status, version: initial.version })
      if (!result.review || result.review.status !== next || result.review.version !== initial.version) throw new Error("Oznaka nije potvrđena. Osvezi stranicu.")
      setStatus(next); setSaved(true); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Oznaka nije sacuvana.") }
    finally { running.current = false; setBusy(false) }
  }
  return <div className={styles.control + (compact ? " " + styles.compact : "")}>
    <label htmlFor={id}>{t("Provera pesme")}<select id={id} className={styles.select} value={status} disabled={busy} onChange={event => { if (isReviewStatus(event.target.value)) void change(event.target.value) }}>
      {reviewStatuses.map(value => <option key={value} value={value}>{t(reviewLabels[value])}</option>)}
    </select></label>
    {!compact && <SongReviewBadge status={status} />}
    {status === "manually_corrected" && <p className={compact ? "sr-only" : styles.description}>{t("Raspored ili tekst su ispravljeni; muzicka tacnost jos nije potvrdjena.")}</p>}
    {busy && <span role="status" className={styles.saved}>{t("Cuvam...")}</span>}
    {saved && <span role="status" className={styles.saved}>{t("Oznaka je sacuvana.")}</span>}
    {error && <div role="alert" className={styles.error}><p>{t(error)}</p><button type="button" className={styles.refresh} onClick={() => router.refresh()}><RefreshCw />{t("Osvezi stranicu")}</button></div>}
  </div>
}
