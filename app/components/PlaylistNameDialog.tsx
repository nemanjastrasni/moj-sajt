"use client"

import { useRef, useState } from "react"
import { LoaderCircle, Save } from "lucide-react"
import { playlistName } from "@/lib/playlists/validation"
import PlaylistDialog from "./PlaylistDialog"
import { useI18n } from "./UiText"
import styles from "./PlaylistClient.module.css"

export default function PlaylistNameDialog({ initialName = "", close, save }: { initialName?: string; close: () => void; save: (name: string) => Promise<void> }) {
  const { t } = useI18n(), [name, setName] = useState(initialName), [busy, setBusy] = useState(false), [error, setError] = useState("")
  const running = useRef(false)
  return <PlaylistDialog title={initialName ? "Preimenuj playlistu" : "Nova playlista"} close={close} busy={busy}>
    <form onSubmit={async event => {
      event.preventDefault()
      if (running.current) return
      running.current = true; setBusy(true); setError("")
      try { await save(playlistName(name)); close() }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Promena nije uspela. Proveri internet vezu.") }
      finally { running.current = false; setBusy(false) }
    }}>
      <label className={styles.field}>{t("Naziv playliste")}<input autoFocus value={name} onChange={event => setName(event.target.value)} maxLength={120} required disabled={busy} /></label>
      {error && <p role="alert" className={styles.error}>{t(error)}</p>}
      <div className={styles.actions}><button type="button" className={styles.button} disabled={busy} onClick={close}>{t("Otkazi")}</button><button type="submit" className={styles.button} disabled={busy || !name.trim()}>{busy ? <LoaderCircle className="animate-spin" /> : <Save />}{t(busy ? "Cuvam..." : "Sacuvaj")}</button></div>
    </form>
  </PlaylistDialog>
}
