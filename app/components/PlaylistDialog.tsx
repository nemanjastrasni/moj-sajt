"use client"

import { useEffect, useId, useRef, type ReactNode } from "react"
import { X } from "lucide-react"
import { useI18n } from "./UiText"
import styles from "./PlaylistClient.module.css"

export default function PlaylistDialog({ title, busy = false, close, children }: { title: string; busy?: boolean; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null), id = useId(), { t } = useI18n()
  useEffect(() => {
    const dialog = ref.current, trigger = document.activeElement
    dialog?.showModal()
    dialog?.querySelector<HTMLElement>("input, select, textarea")?.focus()
    return () => { dialog?.close(); if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus() }
  }, [])
  return <dialog ref={ref} className={styles.dialog} aria-labelledby={id} aria-busy={busy} onCancel={event => { event.preventDefault(); if (!busy) close() }}>
    <div className={styles.header}><h2 id={id}>{t(title)}</h2><button type="button" className={styles.icon} onClick={close} disabled={busy} title={t("Zatvori")} aria-label={t("Zatvori")}><X /></button></div>
    {children}
  </dialog>
}
