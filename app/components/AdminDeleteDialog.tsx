"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Trash2 } from "lucide-react"
import { useI18n } from "./UiText"
import styles from "./AdminContent.module.css"

export default function AdminDeleteDialog({ open, name, title, description, busy, error, close, confirm }: {
  open: boolean; name: string; title: string; description: string; busy: boolean; error: string; close: () => void; confirm: () => void
}) {
  const { t } = useI18n(), id = useId(), dialog = useRef<HTMLDialogElement>(null)
  const [typed, setTyped] = useState("")
  useEffect(() => {
    if (open) dialog.current?.showModal()
    else dialog.current?.close()
  }, [open])
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={id + "-title"} aria-describedby={id + "-description"} onCancel={event => { event.preventDefault(); if (!busy) close() }} onClick={event => { if (event.target === dialog.current && !busy) close() }}>
    <h2 id={id + "-title"}>{title}</h2>
    <p id={id + "-description"}>{description}</p>
    <p translate="no"><strong>{name}</strong></p>
    <form onSubmit={event => { event.preventDefault(); if (!busy && typed === name) confirm() }}>
      <label htmlFor={id + "-confirm"}>{t("Za potvrdu upisi ceo naziv")}<input autoComplete="off" id={id + "-confirm"} autoFocus disabled={busy} className={styles.input} value={typed} maxLength={200} onChange={event => setTyped(event.target.value)} /></label>
      {error && <p role="alert" className={styles.error}>{t(error)}</p>}
      <div className={styles.actions}><button type="button" disabled={busy} onClick={close} className={styles.button}>{t("Otkazi")}</button><button type="submit" disabled={busy || typed !== name} className={styles.button + " " + styles.primary}><Trash2 />{t(busy ? "Brisem..." : "Potvrdi brisanje")}</button></div>
    </form>
  </dialog>
}
