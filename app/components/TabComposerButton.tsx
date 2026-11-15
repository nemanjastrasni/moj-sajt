"use client"

import dynamic from "next/dynamic"
import { useRef, useState } from "react"
import { ListMusic } from "lucide-react"
import { insertTabBlock } from "@/lib/chords/tabComposer"
import { useI18n } from "./UiText"

const TabComposer = dynamic(() => import("./TabComposer"), { ssr: false })

export default function TabComposerButton({ textareaId, value, onChange, maxLength, disabled = false }: {
  textareaId: string; value: string; onChange: (value: string) => void; maxLength: number; disabled?: boolean
}) {
  const { t } = useI18n()
  const [opened, setOpened] = useState(false), [open, setOpen] = useState(false)
  const snapshot = useRef({ value: "", displayed: "", cursor: 0 })
  function show() {
    const input = document.getElementById(textareaId)
    if (!(input instanceof HTMLTextAreaElement) || disabled) return
    snapshot.current = { value, displayed: input.value, cursor: input.selectionEnd }
    setOpened(true); setOpen(true)
  }
  function insert(tab: string): string | undefined {
    if (disabled || snapshot.current.value !== value) return "Tekst je u međuvremenu promenjen. Zatvori unos taba i otvori ga ponovo."
    try {
      const result = insertTabBlock(snapshot.current.displayed, snapshot.current.cursor, tab, maxLength)
      onChange(result.value); setOpen(false)
      requestAnimationFrame(() => {
        const input = document.getElementById(textareaId)
        if (input instanceof HTMLTextAreaElement) { input.focus(); input.setSelectionRange(result.cursor, result.cursor) }
      })
    } catch (error) { return error instanceof Error ? error.message : "Tabulatura nije ubačena." }
  }
  return <>
    <button type="button" className="ui-button" disabled={disabled} onClick={show}><ListMusic aria-hidden="true" />{t("Dodaj tabulaturu")}</button>
    {opened && <TabComposer open={open} close={() => setOpen(false)} insert={insert} />}
  </>
}
