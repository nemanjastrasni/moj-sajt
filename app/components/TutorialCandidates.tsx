"use client"
import { useEffect, useRef, useState } from "react"
import { ExternalLink, Search } from "lucide-react"
import { candidateSearchUrl, isTutorialCandidates, type TutorialCandidate, type TutorialCandidates as Results } from "@/lib/tutorials/candidates"
import { tutorialUrl } from "@/lib/tutorials/model"
import { useI18n } from "./UiText"
import styles from "./SongTutorial.module.css"

export default function TutorialCandidates({ songId, disabled, onSelect }: { songId: string; disabled: boolean; onSelect: (item: TutorialCandidate) => void }) {
  const { t } = useI18n(), [result, setResult] = useState<Results | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(true), [searched, setSearched] = useState(false)
  const running = useRef<AbortController | null>(null), alive = useRef(true)
  useEffect(() => {
    const controller = new AbortController(); running.current = controller; alive.current = true
    void load(true, controller)
    return () => { alive.current = false; controller.abort(); running.current?.abort() }
    // A new song gets a new control, including its pending request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId])
  async function load(preview: boolean, controller: AbortController) {
    let timedOut = false
    const timer = setTimeout(() => { timedOut = true; controller.abort() }, 12000)
    try {
      const response = await fetch(`/api/songs/${encodeURIComponent(songId)}/tutorial/candidates`, { method: "POST", credentials: "same-origin", cache: "no-store", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preview }) })
      const value = await response.json()
      if (controller.signal.aborted || !alive.current) return
      if (!response.ok) throw Error(typeof value.error === "string" ? value.error : "Pretraga trenutno nije dostupna.")
      if (!isTutorialCandidates(value, songId)) throw Error("Pretraga trenutno nije dostupna.")
      setResult(value); setError(""); if (!preview) setSearched(true)
    } catch (cause) {
      if (alive.current && (!controller.signal.aborted || timedOut)) setError(timedOut ? "Pretraga traje predugo. Pokušaj ponovo ili otvori YouTube pretragu." : cause instanceof Error ? cause.message : "Pretraga trenutno nije dostupna.")
    } finally {
      clearTimeout(timer)
      if (running.current === controller) { running.current = null; if (alive.current) setBusy(false) }
    }
  }
  function search() {
    if (busy || disabled) return
    running.current?.abort()
    const controller = new AbortController(); running.current = controller; setBusy(true); setError("")
    void load(!result, controller)
  }
  return <section className={styles.discovery} aria-label={t("Pronađi tutorijal")}>
    <p className={styles.hint}>{t("Pronađi lekciju za ovu pesmu. Pogledaj snimak i proveri verziju pre čuvanja.")}</p>
    <div className={styles.commands}>
      <button type="button" className="ui-button" onClick={search} disabled={busy || disabled || result?.available === false}><Search size={18} aria-hidden="true" />{t(busy ? "Tražim..." : !result && error ? "Pokusaj ponovo" : "Pronađi tutorijale")}</button>
      {result && <a className="ui-button" href={candidateSearchUrl(result.query)} target="_blank" rel="noopener noreferrer"><ExternalLink size={18} aria-hidden="true" />{t("Pretraži na YouTube-u")}</a>}
    </div>
    {result?.available === false && <p className={styles.hint}>{t("Automatski predlozi nisu podešeni. Otvori YouTube pretragu i nalepi izabrani link ispod.")}</p>}
    {error && <p className={styles.error} role="alert">{t(error)}</p>}
    {busy && <p className={styles.hint} role="status">{t("Tražim lekcije po nazivu pesme i izvođača...")}</p>}
    {searched && !busy && result?.available && result.candidates.length === 0 && <p className={styles.hint} role="status">{t("Nema dovoljno pouzdanih predloga po nazivu. Proveri direktnu YouTube pretragu ili unesi link ručno.")}</p>}
    {result && result.candidates.length > 0 && <ul className={styles.candidates}>
      {result.candidates.map(item => <li key={item.videoId}>
        <span className={styles.candidateTitle} translate="no">{item.title}</span><span className={styles.hint} translate="no">{item.channel}</span>
        <div className={styles.commands}><a className="ui-button" href={tutorialUrl(item.videoId)} target="_blank" rel="noopener noreferrer">{t("Pogledaj na YouTube-u")}</a><button type="button" className="ui-button" disabled={busy || disabled} onClick={() => onSelect(item)}>{t("Izaberi")}</button></div>
      </li>)}
    </ul>}
  </section>
}
