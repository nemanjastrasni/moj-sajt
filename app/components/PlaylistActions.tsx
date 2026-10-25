"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle, Pencil, Trash2 } from "lucide-react"
import { playlistRequest } from "@/lib/playlists/client"
import { useI18n } from "./UiText"
import PlaylistDialog from "./PlaylistDialog"
import PlaylistNameDialog from "./PlaylistNameDialog"
import styles from "./PlaylistClient.module.css"

export default function PlaylistActions({ id, name, disabled = false, onRename }: { id: string; name: string; disabled?: boolean; onRename?: (name: string) => void }) {
  const { t } = useI18n(), router = useRouter()
  const [rename, setRename] = useState(false), [remove, setRemove] = useState(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState("")
  const running = useRef(false)
  return <>
    <button type="button" className={styles.icon} disabled={disabled} onClick={() => setRename(true)} title={t("Preimenuj playlistu")} aria-label={t("Preimenuj playlistu") + ": " + name}><Pencil /></button>
    <button type="button" className={styles.icon + " " + styles.remove} disabled={disabled} onClick={() => { setError(""); setRemove(true) }} title={t("Obrisi playlistu")} aria-label={t("Obrisi playlistu") + ": " + name}><Trash2 /></button>
    {rename && <PlaylistNameDialog initialName={name} close={() => setRename(false)} save={async value => {
      const data = await playlistRequest<{ id: string; name: string }>("/api/playlist", "PATCH", { playlistId: id, name: value })
      if (data.id !== id || data.name !== value) throw new Error("Promena nije uspela. Osvezi playlistu i pokusaj ponovo.")
      if (onRename) onRename(data.name)
      else router.refresh()
    }} />}
    {remove && <PlaylistDialog title="Obriši playlistu?" busy={busy} close={() => setRemove(false)}>
      <p className={styles.notice} translate="no">{name}</p>
      {error && <p className={styles.error} role="alert">{t(error)}</p>}
      <div className={styles.actions}>
        <button type="button" className={styles.button} disabled={busy} onClick={() => setRemove(false)}>{t("Otkazi")}</button>
        <button type="button" className={styles.button + " " + styles.remove} disabled={busy} onClick={async () => {
          if (running.current) return
          running.current = true; setBusy(true); setError("")
          try {
            const data = await playlistRequest("/api/playlist", "DELETE", { playlistId: id })
            if (data.ok !== true) throw new Error("Promena nije uspela. Osvezi playlistu i pokusaj ponovo.")
            setRemove(false); router.push("/profile/plejliste"); router.refresh()
          } catch (cause) { setError(cause instanceof Error ? cause.message : "Promena nije uspela. Proveri internet vezu.") }
          finally { running.current = false; setBusy(false) }
        }}>{busy ? <LoaderCircle className="animate-spin" /> : <Trash2 />}{t("Obrisi")}</button>
      </div>
    </PlaylistDialog>}
  </>
}
