"use client"

import { useEffect, useRef, useState } from "react"
import { Copy, Share2 } from "lucide-react"
import { copyMusicText, shareCancelled } from "@/lib/music/share"
import PlaylistDialog from "./PlaylistDialog"
import { useI18n } from "./UiText"
import styles from "./Music.module.css"

export default function MusicItemShare({ title, url, close }: { title: string; url: string; close: () => void }) {
  const { t } = useI18n()
  const [canShare, setCanShare] = useState(false), [busy, setBusy] = useState(false), [notice, setNotice] = useState("")
  const field = useRef<HTMLInputElement>(null)
  useEffect(() => { setCanShare(typeof navigator.share === "function") }, [])

  async function copyLink() {
    if (await copyMusicText(url, navigator.clipboard)) setNotice("Link snimka je kopiran.")
    else {
      field.current?.focus()
      field.current?.select()
      setNotice("Link je označen. Možeš da ga kopiraš ručno.")
    }
  }

  async function share() {
    if (busy) return
    setBusy(true)
    setNotice("")
    try { await navigator.share({ title, url }) }
    catch (error) { if (!shareCancelled(error)) await copyLink() }
    finally { setBusy(false) }
  }

  return <PlaylistDialog title="Podeli snimak" close={close} busy={busy}>
    <p className={styles.notice} translate="no"><strong>{title}</strong></p>
    <label className={styles.shareLabel}>{t("Link snimka")}<input ref={field} className="ui-input" type="url" value={url} readOnly translate="no" /></label>
    <div className={styles.shareActions}>
      <button type="button" className="ui-button ui-button-primary" disabled={busy} onClick={() => void copyLink()}><Copy aria-hidden="true" />{t("Kopiraj link snimka")}</button>
      {canShare && <button type="button" className="ui-button" disabled={busy} onClick={() => void share()}><Share2 aria-hidden="true" />{t("Podeli preko telefona / uređaja")}</button>}
    </div>
    {notice && <p role="status" className={styles.notice}>{t(notice)}</p>}
  </PlaylistDialog>
}
