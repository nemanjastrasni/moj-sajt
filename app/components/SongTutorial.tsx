"use client"
import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { ExternalLink, Pencil, Plus, RefreshCw, Save, Trash2, Video } from "lucide-react"
import { tutorialUrl, type TutorialSnapshot } from "@/lib/tutorials/model"
import { tutorialRequest } from "@/lib/tutorials/client"
import PlaylistDialog from "./PlaylistDialog"
import { useI18n } from "./UiText"
import styles from "./SongTutorial.module.css"

export default function SongTutorial({ songId, onPlay }: { songId: string; onPlay?: () => void }) {
  const { data: session, status } = useSession()
  if (status === "loading") return null
  return <TutorialControl key={JSON.stringify([songId, status, session?.user?.id])} songId={songId} onPlay={onPlay} />
}
function TutorialControl({ songId, onPlay }: { songId: string; onPlay?: () => void }) {
  const { t } = useI18n()
  const [view, setView] = useState<TutorialSnapshot | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false), [retry, setRetry] = useState(0)
  const [modal, setModal] = useState<"edit" | "remove" | "video" | null>(null), [url, setUrl] = useState(""), [title, setTitle] = useState("")
  const running = useRef<AbortController | null>(null), alive = useRef(true)
  useEffect(() => {
    const controller = new AbortController(); alive.current = true
    void tutorialRequest(songId, "GET", undefined, controller.signal).then(value => { if (!controller.signal.aborted) { setView(value); setError("") } }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Tutorijali trenutno nisu dostupni. Poku\u0161aj ponovo.") }).finally(() => { if (!controller.signal.aborted) setBusy(false) })
    return () => { alive.current = false; controller.abort(); running.current?.abort() }
  }, [songId, retry])
  function edit() {
    setUrl(view?.tutorial ? tutorialUrl(view.tutorial.videoId) : ""); setTitle(view?.tutorial?.title ?? ""); setError(""); setModal("edit")
  }
  async function save(remove: boolean) {
    if (!view?.editable || running.current) return
    const controller = new AbortController(); running.current = controller; setBusy(true); setError("")
    try {
      const value = await tutorialRequest(songId, remove ? "DELETE" : "PUT", { expectedVersion: view.tutorial?.version ?? null, ...(remove ? {} : { url, title }) }, controller.signal)
      if (alive.current && !controller.signal.aborted) { setView(value); setModal(null) }
    } catch (cause) { if (alive.current && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Tutorijali trenutno nisu dostupni. Poku\u0161aj ponovo.") }
    finally { if (running.current === controller) running.current = null; if (alive.current) setBusy(false) }
  }
  function reload() { if (busy) return; setModal(null); setError(""); setBusy(true); setRetry(value => value + 1) }
  if (!view) return error ? <span className={styles.error} role="alert">{t(error)}<button className="ui-button" type="button" onClick={reload} title={t("Pokusaj ponovo")} aria-label={t("Pokusaj ponovo")}><RefreshCw size={18} /></button></span> : null
  return <div className={styles.tools} data-song-tutorial>
    {view.tutorial && <button type="button" className="ui-button" disabled={busy} onClick={() => { onPlay?.(); setError(""); setModal("video") }}><Video size={18} aria-hidden="true" />{t("Kako se svira")}</button>}
    {view.editable && <button type="button" className="ui-button" disabled={busy} title={t(view.tutorial ? "Izmeni tutorijal" : "Dodaj tutorijal")} aria-label={t(view.tutorial ? "Izmeni tutorijal" : "Dodaj tutorijal")} onClick={edit}>{view.tutorial ? <Pencil size={18} /> : <Plus size={18} />}{!view.tutorial && t("Tutorijal")}</button>}
    {error && !modal && <span className={styles.error} role="alert">{t(error)}<button type="button" className="ui-button" disabled={busy} onClick={reload}><RefreshCw size={18} />{t("Pokusaj ponovo")}</button></span>}
    {modal === "video" && view.tutorial && <PlaylistDialog title="Kako se svira" close={() => setModal(null)}>
      {view.tutorial.title && <p className={styles.title} translate="no">{view.tutorial.title}</p>}
      <iframe className={styles.video} src={`https://www.youtube-nocookie.com/embed/${view.tutorial.videoId}?playsinline=1`} title={view.tutorial.title || t("Video tutorijal")} allow="encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
      <a className="ui-button" href={tutorialUrl(view.tutorial.videoId)} target="_blank" rel="noopener noreferrer"><ExternalLink size={18} aria-hidden="true" />{t("Otvori na YouTube-u")}</a>
    </PlaylistDialog>}
    {modal === "edit" && view.editable && <PlaylistDialog title={view.tutorial ? "Izmeni tutorijal" : "Dodaj tutorijal"} busy={busy} close={() => setModal(null)}>
      <form className={styles.form} onSubmit={event => { event.preventDefault(); void save(false) }}>
        <label>{t("YouTube ili Shorts link")}<input className="ui-input" type="url" inputMode="url" required maxLength={2000} value={url} disabled={busy} onChange={event => setUrl(event.target.value)} /></label>
        <label>{t("Naziv tutorijala (neobavezno)")}<input className="ui-input" maxLength={120} value={title} disabled={busy} onChange={event => setTitle(event.target.value)} /></label>
        {error && <div role="alert" className={styles.error}>{t(error)}<button type="button" className="ui-button" disabled={busy} onClick={reload}><RefreshCw size={18} />{t("U\u010ditaj sa\u010duvani tutorijal")}</button></div>}
        <div className={styles.commands}><button type="submit" className="ui-button ui-button-primary" disabled={busy}><Save size={18} />{t(busy ? "Cuvam..." : "Sa\u010duvaj tutorijal")}</button>{view.tutorial && <button type="button" className="ui-button ui-button-danger" disabled={busy} onClick={() => { setError(""); setModal("remove") }}><Trash2 size={18} />{t("Ukloni tutorijal")}</button>}</div>
      </form>
    </PlaylistDialog>}
    {modal === "remove" && view.editable && <PlaylistDialog title="Ukloni tutorijal" busy={busy} close={() => setModal(null)}>
      <p className={styles.title}>{t("Uklanja se samo veza do tutorijala. Pesma ostaje neizmenjena.")}</p>
      {error && <div role="alert" className={styles.error}>{t(error)}<button type="button" className="ui-button" disabled={busy} onClick={reload}><RefreshCw size={18} />{t("U\u010ditaj sa\u010duvani tutorijal")}</button></div>}
      <div className={styles.commands}><button type="button" className="ui-button" disabled={busy} onClick={() => setModal(null)}>{t("Otkazi")}</button><button type="button" className="ui-button ui-button-destructive" disabled={busy} onClick={() => void save(true)}><Trash2 size={18} />{t("Potvrdi uklanjanje")}</button></div>
    </PlaylistDialog>}
  </div>
}
