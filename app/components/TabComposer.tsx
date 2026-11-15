"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Plus, RotateCcw } from "lucide-react"
import { emptyTabSteps, MAX_TAB_STEPS, renderTabSteps, setTabFret, tabHasNotes, TAB_STRINGS } from "@/lib/chords/tabComposer"
import PlaylistDialog from "./PlaylistDialog"
import { useI18n } from "./UiText"
import styles from "./TabComposer.module.css"

export default function TabComposer({ open, close, insert }: { open: boolean; close: () => void; insert: (tab: string) => string | undefined }) {
  const { t } = useI18n()
  const [steps, setSteps] = useState(() => emptyTabSteps()), [step, setStep] = useState(0), [range, setRange] = useState(0)
  const [together, setTogether] = useState(false), [error, setError] = useState("")
  const [endReached, setEndReached] = useState(false)
  const tab = useMemo(() => renderTabSteps(steps), [steps]), hasNotes = tabHasNotes(steps)
  function note(string: number, fret: number) {
    if (endReached && !together) return
    const removing = steps[step][string] === fret
    setSteps(current => {
      const changed = setTabFret(current, step, string, fret)
      return !together && !removing && step === current.length - 1 && current.length < MAX_TAB_STEPS ? [...changed, ...emptyTabSteps(Math.min(8, MAX_TAB_STEPS - current.length))] : changed
    }); setError("")
    if (!together && !removing) {
      if (step < MAX_TAB_STEPS - 1) setStep(step + 1)
      else { setEndReached(true); setError("Blok ima 64 koraka. Ubaci ga u tekst ili izaberi korak koji želiš da izmeniš.") }
    }
  }
  function chooseStep(value: number) { setStep(value); setEndReached(false); setError("") }
  function clear() { setSteps(emptyTabSteps()); setStep(0); setRange(0); setError(""); setEndReached(false) }
  if (!open) return null
  function dismiss() { setError(""); close() }
  return <PlaylistDialog title="Sastavi tabulaturu" close={dismiss}>
    <div className={styles.editor}>
      <p>{t("Klikni žicu i prag. Broj 0 znači praznu žicu; ponovni klik uklanja notu.")}</p>
      <p className={styles.muted}>{t("Standardni štim: E A D G B e. Na vrhu je prva, najtanja žica e.")}</p>
      <div className={styles.options}>
        <label>{t("Pragovi")}<select className="ui-input" value={range} onChange={event => setRange(Number(event.target.value))}>{[0, 5, 10, 15, 20].map(start => <option key={start} value={start}>{start}–{start + 4}</option>)}</select></label>
        <label>{t("Korak")}<select className="ui-input" value={step} onChange={event => chooseStep(Number(event.target.value))}>{steps.map((_, index) => <option key={index} value={index}>{index + 1} / {steps.length}</option>)}</select></label>
      </div>
      <label className={styles.check}><input type="checkbox" checked={together} onChange={event => setTogether(event.target.checked)} />{t("Više nota u istom koraku")}</label>
      <div className={styles.frets} role="group" aria-label={t("Izbor žice i praga")}>
        <span aria-hidden="true" />{Array.from({ length: 5 }, (_, index) => <span key={index} className={styles.fretLabel} aria-hidden="true">{range + index}</span>)}
        {TAB_STRINGS.map((label, string) => <div key={string} className={styles.stringRow}>
          <span className={styles.stringLabel} aria-label={t("Žica {number}", { number: string + 1 })}>{label}</span>
          {Array.from({ length: 5 }, (_, index) => {
            const fret = range + index
            return <button key={fret} type="button" className={styles.fret} disabled={endReached && !together} aria-label={t("Žica {string}, prag {fret}", { string: string + 1, fret })} aria-pressed={steps[step][string] === fret} onClick={() => note(string, fret)}>{fret}</button>
          })}
        </div>)}
      </div>
      <div className={styles.actions}>
        <button type="button" className="ui-button" disabled={step === 0} onClick={() => chooseStep(step - 1)} aria-label={t("Prethodni korak")}><ChevronLeft aria-hidden="true" /></button>
        <button type="button" className="ui-button" disabled={step === steps.length - 1} onClick={() => chooseStep(step + 1)} aria-label={t("Sledeći korak")}><ChevronRight aria-hidden="true" /></button>
        <button type="button" className="ui-button" onClick={() => { setSteps(current => current.map((notes, index) => index === step ? Array<number | null>(6).fill(null) : notes)); setEndReached(false); setError("") }}>{t("Obriši korak")}</button>
        <button type="button" className="ui-button" disabled={steps.length >= MAX_TAB_STEPS} onClick={() => setSteps(current => current.length >= MAX_TAB_STEPS ? current : [...current, ...emptyTabSteps(Math.min(8, MAX_TAB_STEPS - current.length))])}><Plus aria-hidden="true" />{t("Još 8 koraka")}</button>
      </div>
      <p className={styles.muted}>{t("Koraci određuju redosled nota, ne njihovo trajanje.")}</p>
      <div className={styles.preview} role="region" aria-label={t("Pregled tabulature")} tabIndex={0}><pre translate="no">{tab}</pre></div>
      <p className={styles.muted}>{t("Tab će biti dodat ispod reda u kojem je kursor. Postojeći tekst ostaje sačuvan.")}</p>
      {error && <p role="alert" className={styles.error}>{t(error)}</p>}
      <div className={styles.actions}>
        <button type="button" className="ui-button" onClick={clear}><RotateCcw aria-hidden="true" />{t("Počni iznova")}</button>
        <button type="button" className="ui-button" onClick={dismiss}>{t("Otkaži")}</button>
        <button type="button" className="ui-button ui-button-primary" disabled={!hasNotes} onClick={() => { const failure = insert(tab); if (failure) setError(failure); else clear() }}>{t("Ubaci tabulaturu")}</button>
      </div>
    </div>
  </PlaylistDialog>
}
