"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { ArrowDown, ArrowUp, Check, Gauge, LoaderCircle, Mic, Square, X } from "lucide-react"
import { AUDIO_TOOL_CLAIM } from "@/lib/audio-tools"
import { GUITAR_STRINGS, noteName, stringChoice, tunerError, type StringChoice, type TunerReading } from "@/lib/tuner/model"
import { beginTuner } from "@/lib/tuner/session"
import { useI18n } from "./UiText"
import styles from "./TunerButton.module.css"

export default function TunerButton() {
  const pathname = usePathname()
  return <TunerControl key={pathname} />
}
function TunerControl() {
  const { t } = useI18n(), [open, setOpen] = useState(false)
  return <>
    <button type="button" className={styles.icon} title={t("Stimer")} aria-label={t("Stimer")} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><Gauge /></button>
    {open && <TunerPanel close={() => setOpen(false)} />}
  </>
}
function TunerPanel({ close }: { close: () => void }) {
  const { t, locale } = useI18n(), id = useId(), dialog = useRef<HTMLDialogElement>(null)
  const [phase, setPhase] = useState<"stopped" | "starting" | "listening">("stopped")
  const [choice, setChoice] = useState<StringChoice>("auto"), [reading, setReading] = useState<TunerReading | null>(null), [error, setError] = useState("")
  const session = useRef<ReturnType<typeof beginTuner> | null>(null)
  const release = useCallback(() => { const current = session.current; session.current = null; current?.stop() }, [])
  const stop = useCallback(() => { release(); setPhase("stopped"); setReading(null) }, [release])
  useEffect(() => release, [release])
  useEffect(() => {
    const element = dialog.current, trigger = document.activeElement, oldOverflow = document.body.style.overflow
    element?.showModal(); document.body.style.overflow = "hidden"
    return () => { element?.close(); document.body.style.overflow = oldOverflow; if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus() }
  }, [])
  useEffect(() => {
    const claim = (event: Event) => { if (event instanceof CustomEvent && event.detail !== id) stop() }
    const hide = () => { if (document.hidden) stop() }
    window.addEventListener(AUDIO_TOOL_CLAIM, claim)
    window.dispatchEvent(new CustomEvent(AUDIO_TOOL_CLAIM, { detail: id }))
    document.addEventListener("visibilitychange", hide); window.addEventListener("pagehide", stop)
    return () => { window.removeEventListener(AUDIO_TOOL_CLAIM, claim); document.removeEventListener("visibilitychange", hide); window.removeEventListener("pagehide", stop) }
  }, [id, stop])
  async function start() {
    if (session.current) return
    setError(""); setReading(null); setPhase("starting")
    try {
      const current = beginTuner(choice, setReading, () => { stop(); setError("Mikrofon je prekinut. Pokreni stimer ponovo.") })
      session.current = current
      try {
        await current.ready
        if (session.current !== current) return
        if (document.hidden) { stop(); return }
        setPhase("listening")
      } catch (cause) {
        if (session.current !== current) return
        stop(); setError(tunerError(cause))
      }
    } catch (cause) { stop(); setError(tunerError(cause)) }
  }
  const direction = reading?.direction
  const message = !reading ? "Cekam ton" : direction === "in_tune" ? "Nastimovano" : direction === "flat" ? "Zategni zicu" : direction === "sharp" ? "Otpusti zicu" : "Proveri izabranu zicu"
  const target = reading?.target ?? GUITAR_STRINGS.find(string => string.number === choice)
  const position = reading ? 50 + Math.max(-50, Math.min(50, reading.cents)) : 50
  const roundedCents = reading ? Math.round(reading.cents) : 0
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={id} onCancel={event => { event.preventDefault(); event.stopPropagation(); close() }}>
    <header className={styles.header}><h2 id={id}>{t("Stimer")}</h2><button type="button" className={styles.icon} title={t("Zatvori")} aria-label={t("Zatvori")} onClick={close}><X /></button></header>
    <label className={styles.selection} htmlFor={id + "-string"}>{t("Zica")}<select id={id + "-string"} value={choice} onChange={event => { const value = stringChoice(event.target.value); setChoice(value); setReading(null); session.current?.select(value) }}>
      <option value="auto">{t("Automatski")}</option>{GUITAR_STRINGS.map(string => <option key={string.number} value={string.number}>{string.number} · {noteName(string.midi, locale)}</option>)}
    </select></label>
    <div className={styles.pitch} data-tuned={direction === "in_tune"}>
      <output className={styles.note} aria-label={t("Prepoznati ton")}>{reading ? noteName(reading.midi, locale) : "--"}</output>
      <div className={styles.frequency}>{reading ? reading.frequency.toFixed(1) + " Hz" : "-- Hz"}</div>
      <div className={styles.target}>{target ? t("Zica {number}: {note}", { number: target.number, note: noteName(target.midi, locale) }) : t("Standardni stim")}</div>
    </div>
    <div className={styles.scale} role="meter" aria-label={t("Odstupanje tona")} aria-valuemin={-50} aria-valuemax={50} aria-valuenow={reading ? Math.max(-50, Math.min(50, Math.round(reading.cents))) : 0} aria-valuetext={reading ? t("{count} centi", { count: Math.round(reading.cents) }) : t("Cekam ton")}>
      <div className={styles.track}><span className={styles.center} />{reading && <span className={styles.needle} data-tuned={direction === "in_tune"} style={{ left: position + "%" }} />}</div>
      <div className={styles.ticks} aria-hidden="true"><span>-50</span><span>0</span><span>+50</span></div>
    </div>
    <p className={styles.deviation}>{reading ? t("{count} centi", { count: (roundedCents > 0 ? "+" : "") + roundedCents }) : "--"}</p>
    <p className={styles.result} data-tuned={direction === "in_tune"} role="status">{direction === "in_tune" ? <Check /> : direction === "flat" ? <ArrowUp /> : direction === "sharp" ? <ArrowDown /> : null}{t(phase === "listening" ? message : phase === "starting" ? "Cekam dozvolu za mikrofon..." : "Mikrofon je iskljucen")}</p>
    <button type="button" className={styles.start} aria-pressed={phase !== "stopped"} onClick={() => phase === "stopped" ? void start() : stop()}>{phase === "starting" ? <LoaderCircle /> : phase === "listening" ? <Square /> : <Mic />}{t(phase === "stopped" ? "Ukljuci mikrofon" : "Iskljuci mikrofon")}</button>
    {error && <p role="alert" className={styles.error}>{t(error)}</p>}
    <div className={styles.standard}><span>{t("Standardni stim")}</span><span translate="no">{GUITAR_STRINGS.map(string => noteName(string.midi, locale)).join(" · ")}</span><span>A4 = 440 Hz</span></div>
  </dialog>
}
