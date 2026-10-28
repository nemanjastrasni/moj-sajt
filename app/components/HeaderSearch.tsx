"use client"

import { useEffect, useId, useRef } from "react"
import { X } from "lucide-react"
import SongSearch from "./SongSearch"
import { useI18n } from "./UiText"

export default function HeaderSearch({ close }: { close: () => void }) {
  const { t } = useI18n(), id = useId(), dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current, trigger = document.activeElement, overflow = document.body.style.overflow
    element?.showModal()
    element?.querySelector("input")?.focus()
    document.body.style.overflow = "hidden"
    return () => {
      element?.close()
      document.body.style.overflow = overflow
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])
  return <dialog ref={dialog} className="header-search-dialog" aria-labelledby={id} onCancel={event => { event.preventDefault(); event.stopPropagation(); close() }} onClick={event => {
    if (event.target !== event.currentTarget) return
    const bounds = event.currentTarget.getBoundingClientRect()
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close()
  }}>
    <div className="header-search-heading"><h2 id={id}>{t("Pretraga pesama")}</h2><button type="button" className="header-search-close" onClick={close} title={t("Zatvori")} aria-label={t("Zatvori")}><X aria-hidden="true" /></button></div>
    <SongSearch inlinePopup onNavigate={close} />
  </dialog>
}
