"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Copy, Download, Link as LinkIcon, Share2 } from "lucide-react"
import type { MusicList } from "@/lib/music/model"
import { copyMusicText, musicShareExport, musicShareFilename, musicShareText, shareCancelled } from "@/lib/music/share"
import { useI18n } from "./UiText"
import PlaylistDialog from "./PlaylistDialog"
import styles from "./Music.module.css"

export default function MusicShare({ list, disabled = false }: { list: MusicList; disabled?: boolean }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false), [nativeShare, setNativeShare] = useState(false), [sharing, setSharing] = useState(false)
  const [notice, setNotice] = useState("")
  const textarea = useRef<HTMLTextAreaElement>(null)
  const text = useMemo(() => musicShareText(list), [list])
  useEffect(() => { setNativeShare(typeof navigator.share === "function") }, [])
  function selectText() { textarea.current?.focus(); textarea.current?.select() }
  async function copy(textToCopy: string, success: string) {
    if (await copyMusicText(textToCopy, navigator.clipboard)) setNotice(success)
    else if (textToCopy === text) { selectText(); setNotice("Kopiranje nije dozvoljeno. Tekst je označen; kopiraj ga ručno.") }
    else setNotice("Kopiranje nije uspelo. Kopiraj adresu iz pregledaca.")
  }
  async function share() {
    if (sharing || disabled) return
    setSharing(true); setNotice("")
    try {
      await navigator.share({ title: list.name, text })
      setNotice("Otvoren je izbor za deljenje liste.")
    } catch (error) {
      if (!shareCancelled(error)) await copy(text, "Deljenje nije dostupno. Cela lista je kopirana.")
    } finally { setSharing(false) }
  }
  function download() {
    const blob = new Blob([musicShareExport(list)], { type: "application/json;charset=utf-8" })
    const url = URL.createObjectURL(blob), link = document.createElement("a")
    link.href = url; link.download = musicShareFilename(list.name)
    document.body.append(link); link.click(); link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    setNotice("Lista je sačuvana. U MP3 programu izaberi Uvezi fajl.")
  }
  return <>
    <button type="button" className="ui-button" disabled={disabled} onClick={() => { setNotice(""); setOpen(true) }}><Share2 aria-hidden="true" />{t("Podeli listu")}</button>
    {open && <PlaylistDialog title="Podeli listu" busy={sharing} close={() => setOpen(false)}>
      <p className={styles.notice} translate="no"><strong>{list.name}</strong> · {list.items.length} {t("stavki")}</p>
      <p className={styles.notice}>{t("Podeli naziv liste, nazive pesama i sve linkove, istim redosledom.")}</p>
      {!list.isPublic && <p className={styles.notice + " " + styles.muted}>{t("Lista ostaje privatna. Deliš samo nazive i linkove pesama.")}</p>}
      <div className={styles.shareActions}>
        <button type="button" className="ui-button ui-button-primary" disabled={!list.items.length || sharing || disabled} onClick={() => void copy(text, "Cela lista je kopirana. Možeš da je nalepiš u MP3 program ili poruku.")}><Copy aria-hidden="true" />{t("Kopiraj celu listu")}</button>
        {nativeShare && <button type="button" className="ui-button" disabled={!list.items.length || sharing || disabled} onClick={() => void share()}><Share2 aria-hidden="true" />{t("Podeli preko telefona / uređaja")}</button>}
        <button type="button" className="ui-button" disabled={!list.items.length || sharing || disabled} onClick={download}><Download aria-hidden="true" />{t("Sačuvaj za MP3 program")}</button>
        {list.isPublic && <button type="button" className="ui-button" disabled={sharing || disabled} onClick={() => void copy(location.origin + "/listening-playlist/" + encodeURIComponent(list.id), "Link playliste je kopiran")}><LinkIcon aria-hidden="true" />{t("Kopiraj link liste")}</button>}
      </div>
      <label className={styles.shareLabel}>{t("Sadržaj za deljenje")}<textarea ref={textarea} className={"ui-input " + styles.shareText} rows={8} readOnly value={text} translate="no" /></label>
      <button type="button" className="ui-button" disabled={sharing} onClick={selectText}>{t("Označi tekst")}</button>
      <p className={styles.notice + " " + styles.muted}>{t("Za MP3 program kopiraj celu listu i nalepi je, ili sačuvaj fajl pa izaberi Uvezi fajl.")}</p>
      {notice && <p role="status" className={styles.notice}>{t(notice)}</p>}
    </PlaylistDialog>}
  </>
}
