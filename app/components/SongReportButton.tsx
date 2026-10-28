"use client"

import { useEffect, useId, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Flag, LoaderCircle, Send } from "lucide-react"
import { reportKindLabels, reportKinds, validateReport, type ReportKind } from "@/lib/songReports/model"
import { reportRequest, ReportRequestError } from "@/lib/songReports/client"
import PlaylistDialog from "./PlaylistDialog"
import { useI18n } from "./UiText"
import styles from "./SongReports.module.css"

type Props = { songId: string; songVersion: string; title: string; artist: string; transpose: number }
export default function SongReportButton(props: Props) {
  const { t } = useI18n(), { data: session, status } = useSession(), router = useRouter()
  const [openedAt, setOpenedAt] = useState<number | null>(null), [notice, setNotice] = useState(false)
  return <>
    <button type="button" className={styles.button} disabled={status === "loading"} aria-haspopup="dialog" onClick={() => {
      if (!session) { router.push("/login?callbackUrl=" + encodeURIComponent(window.location.pathname + window.location.search + window.location.hash)); return }
      setNotice(false); setOpenedAt(props.transpose)
    }}><Flag aria-hidden="true" />{t("Prijavi gresku")}</button>
    {notice && <span role="status" className={styles.success}><CheckCircle2 aria-hidden="true" />{t("Prijava je poslata administratoru.")}</span>}
    {openedAt !== null && <SongReportForm {...props} transpose={openedAt} close={() => setOpenedAt(null)} sent={() => { setOpenedAt(null); setNotice(true) }} />}
  </>
}

function SongReportForm({ songId, songVersion, title, artist, transpose, close, sent }: Props & { close: () => void; sent: () => void }) {
  const { t } = useI18n(), id = useId(), router = useRouter()
  const [kind, setKind] = useState<ReportKind | "">(""), [description, setDescription] = useState(""), [busy, setBusy] = useState(false)
  const [error, setError] = useState(""), [expired, setExpired] = useState(false), running = useRef(false), request = useRef<AbortController | null>(null)
  useEffect(() => {
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { request.current?.abort(); document.body.style.overflow = overflow }
  }, [])
  return <PlaylistDialog title="Prijavi gresku" busy={busy} close={close}>
    <p className={styles.context}><strong>{artist} - {title}</strong><span>{t("Transpozicija")}: {transpose > 0 ? "+" : ""}{transpose}</span></p>
    <form onSubmit={async event => {
      event.preventDefault()
      if (running.current) return
      setError(""); setExpired(false)
      let input
      try { input = validateReport({ songId, songVersion, kind, description, transpose }) }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Neispravni podaci prijave."); return }
      const controller = new AbortController(); request.current = controller; running.current = true; setBusy(true)
      try { await reportRequest("/api/song-reports", "POST", input, controller.signal); if (!controller.signal.aborted) sent() }
      catch (cause) {
        if (!controller.signal.aborted) { setError(cause instanceof Error ? cause.message : "Slanje nije uspelo. Proveri internet vezu."); setExpired(cause instanceof ReportRequestError && cause.status === 401) }
      } finally { running.current = false; if (!controller.signal.aborted) setBusy(false) }
    }}>
      <fieldset disabled={busy} className={styles.fields}>
        <label htmlFor={id + "-kind"}>{t("Vrsta greske")}<select id={id + "-kind"} required value={kind} onChange={event => setKind(event.target.value as ReportKind | "")}>
          <option value="">{t("Izaberi vrstu greske")}</option>{reportKinds.map(value => <option key={value} value={value}>{t(reportKindLabels[value])}</option>)}
        </select></label>
        <label htmlFor={id + "-description"}>{t("Opis greske")}<textarea id={id + "-description"} required minLength={10} maxLength={2000} rows={5} value={description} onChange={event => setDescription(event.target.value)} placeholder={t("Npr. druga strofa, drugi red...")} /></label>
      </fieldset>
      {error && <p role="alert" className={styles.error}>{t(error)}</p>}
      {expired && <button type="button" className={styles.button} onClick={() => router.push("/login?callbackUrl=" + encodeURIComponent(window.location.pathname + window.location.search))}>{t("Prijavi se")}</button>}
      <div className={styles.commands}><button type="button" className={styles.button} disabled={busy} onClick={close}>{t("Otkazi")}</button><button type="submit" className={styles.button} disabled={busy}>{busy ? <LoaderCircle aria-hidden="true" /> : <Send aria-hidden="true" />}{t(busy ? "Saljem..." : "Posalji prijavu")}</button></div>
    </form>
  </PlaylistDialog>
}
