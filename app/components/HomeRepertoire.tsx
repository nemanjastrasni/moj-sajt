"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { useSession } from "next-auth/react"
import { ArrowRight, ListMusic, LoaderCircle, Play, RefreshCw, X } from "lucide-react"
import { forgetPlayback, isResumeItem, parseRecentPlayback, playbackKey, PLAYBACK_EVENT, readRecentPlayback, resumeQuery, type ResumeItem } from "@/lib/performance/recent"
import { useI18n } from "./UiText"
import styles from "./HomeRepertoire.module.css"

const serverSnapshot = () => null
export default function HomeRepertoire() {
  const { data: session, status } = useSession()
  return status === "authenticated" && session?.user?.id ? <MemberRepertoire key={session.user.id} userId={session.user.id} /> : null
}
function MemberRepertoire({ userId }: { userId: string }) {
  const { t } = useI18n()
  const subscribe = useCallback((notify: () => void) => {
    const storage = (event: StorageEvent) => { if (event.key === null || event.key === playbackKey(userId)) notify() }
    window.addEventListener(PLAYBACK_EVENT, notify); window.addEventListener("storage", storage)
    return () => { window.removeEventListener(PLAYBACK_EVENT, notify); window.removeEventListener("storage", storage) }
  }, [userId])
  const raw = useSyncExternalStore(subscribe, useCallback(() => readRecentPlayback(userId), [userId]), serverSnapshot)
  const recent = useMemo(() => parseRecentPlayback(raw), [raw])
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState<{ raw: string; item?: ResumeItem; error?: boolean } | null>(null)
  const current = result?.raw === raw ? result : null
  useEffect(() => {
    if (!recent || !raw) return
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10000)
    let alive = true
    void (async () => {
      try {
        const response = await fetch("/api/performance/resume?" + resumeQuery(recent), { signal: controller.signal, cache: "no-store" })
        if (!alive) return
        if (response.status === 404) { forgetPlayback(userId); return }
        const data: unknown = await response.json()
        if (!response.ok || !isResumeItem(data, recent)) throw Error("resume unavailable")
        if (alive) setResult({ raw, item: data })
      } catch { if (alive) setResult({ raw, error: true }) }
      finally { clearTimeout(timer) }
    })()
    return () => { alive = false; clearTimeout(timer); controller.abort() }
  }, [raw, recent, retry, userId])
  const item = recent ? current?.item : undefined
  return <section className={styles.band} aria-label={t("Tvoj repertoar")}>
    <div className={styles.inner}>
      <div className={styles.identity}>
        <h2><ListMusic aria-hidden="true" />{t("Tvoj repertoar")}</h2>
        {item && <div className={styles.last}><span>{t("Poslednje svirano")}</span><p translate="no"><strong>{item.title}</strong><span>{item.artist}{item.kind === "playlist" ? ` · ${item.playlistName}` : ""}</span></p></div>}
        {recent && !current && <p role="status" className={styles.status}><LoaderCircle aria-hidden="true" />{t("Ucitavam poslednje sviranje...")}</p>}
        {recent && current?.error && <p role="status" className={styles.status}>{t("Nastavak trenutno nije dostupan.")}<button type="button" className={styles.icon} title={t("Pokusaj ponovo")} aria-label={t("Pokusaj ponovo")} onClick={() => { setResult(null); setRetry(value => value + 1) }}><RefreshCw /></button></p>}
      </div>
      <nav className={styles.actions} aria-label={t("Tvoj repertoar")}>
        {item && <Link prefetch={false} className={styles.play} href={item.href}><Play aria-hidden="true" fill="currentColor" />{t("Nastavi sviranje")}</Link>}
        <Link className={styles.playlists} data-primary={!item} href="/profile/plejliste"><ListMusic aria-hidden="true" />{t("Moje plejliste")}<ArrowRight aria-hidden="true" /></Link>
        {recent && <button type="button" className={styles.icon} title={t("Ukloni iz nastavka")} aria-label={t("Ukloni iz nastavka")} onClick={() => forgetPlayback(userId)}><X /></button>}
      </nav>
    </div>
  </section>
}
