"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { Hand, LoaderCircle, Minimize2, Minus, Play, Plus, Square, Timer, X } from "lucide-react"
import { DEFAULT_METRONOME, isMetronomeSettings, MAX_BPM, METRONOME_KEY, MIN_BPM, tapTempo, type MetronomeSettings } from "@/lib/metronome/model"
import { AUDIO_TOOL_CLAIM } from "@/lib/audio-tools"
import type { MetronomeAudio } from "@/lib/metronome/audio"
import { useI18n } from "./UiText"
import styles from "./MetronomeButton.module.css"

export default function MetronomeButton({ onPlayingChange }: { onPlayingChange?: (playing: boolean) => void }) {
  const pathname = usePathname()
  return <MetronomeControl key={pathname} onPlayingChange={onPlayingChange} />
}

function MetronomeControl({ onPlayingChange }: { onPlayingChange?: (playing: boolean) => void }) {
  const { t } = useI18n(), [open, setOpen] = useState(false), [visible, setVisible] = useState(false), [playing, setPlaying] = useState(false)
  const activeChanged = useCallback((value: boolean) => { setPlaying(value); onPlayingChange?.(value) }, [onPlayingChange])
  function close() { setOpen(false); setVisible(false); activeChanged(false) }
  return <>
    <button type="button" className={styles.icon} data-playing={playing} title={t(playing ? "Metronom radi" : "Metronom")} aria-label={t("Metronom")} aria-haspopup="dialog" aria-expanded={visible} onClick={() => { setOpen(true); setVisible(true) }}><Timer /></button>
    {open && <MetronomePanel visible={visible} hide={() => setVisible(false)} activeChanged={activeChanged} close={close} />}
  </>
}

function readSettings(): MetronomeSettings {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(METRONOME_KEY) ?? "null")
    if (isMetronomeSettings(value)) return value
  } catch {}
  return { ...DEFAULT_METRONOME }
}

function MetronomePanel({ close, visible, hide, activeChanged }: { close: () => void; visible: boolean; hide: () => void; activeChanged: (value: boolean) => void }) {
  const { t } = useI18n(), id = useId(), dialog = useRef<HTMLDialogElement>(null)
  const [settings, setSettings] = useState(readSettings), latest = useRef(settings)
  const [bpmInput, setBpmInput] = useState(String(settings.bpm))
  const [phase, setPhase] = useState<"stopped" | "starting" | "playing">("stopped")
  const [beat, setBeat] = useState(-1), [error, setError] = useState("")
  const audio = useRef<MetronomeAudio | null>(null), raw = useRef<AudioContext | null>(null)
  const generation = useRef(0), starting = useRef(false), taps = useRef<number[]>([]), deadline = useRef<ReturnType<typeof setTimeout> | null>(null)

  const release = useCallback(() => {
    generation.current++; starting.current = false
    if (deadline.current !== null) clearTimeout(deadline.current)
    deadline.current = null
    const engine = audio.current, context = raw.current
    audio.current = null; raw.current = null
    if (context) context.onstatechange = null
    engine?.dispose()
    if (!engine && context && context.state !== "closed") void context.close().catch(() => {})
  }, [])
  const stop = useCallback(() => { release(); setPhase("stopped"); setBeat(-1); activeChanged(false) }, [release, activeChanged])
  useEffect(() => release, [release])
  useEffect(() => {
    const claim = (event: Event) => { if (event instanceof CustomEvent && event.detail !== id) stop() }
    window.addEventListener(AUDIO_TOOL_CLAIM, claim)
    return () => window.removeEventListener(AUDIO_TOOL_CLAIM, claim)
  }, [id, stop])
  useEffect(() => { if (visible) window.dispatchEvent(new CustomEvent(AUDIO_TOOL_CLAIM, { detail: id })) }, [id, visible])
  useEffect(() => {
    if (!visible) return
    const element = dialog.current, trigger = document.activeElement, oldOverflow = document.body.style.overflow
    element?.showModal(); document.body.style.overflow = "hidden"
    return () => {
      element?.close(); document.body.style.overflow = oldOverflow
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [visible])
  useEffect(() => {
    const hide = () => { if (document.hidden) stop() }
    window.addEventListener("pagehide", stop); document.addEventListener("visibilitychange", hide)
    return () => { window.removeEventListener("pagehide", stop); document.removeEventListener("visibilitychange", hide) }
  }, [stop])

  function update(next: MetronomeSettings) {
    if (!isMetronomeSettings(next)) return
    latest.current = next; setSettings(next); setBpmInput(String(next.bpm)); audio.current?.update(next)
    try { localStorage.setItem(METRONOME_KEY, JSON.stringify(next)) } catch {}
  }
  async function start() {
    if (starting.current || audio.current) return
    const token = ++generation.current
    starting.current = true; setPhase("starting"); setError("")
    try {
      // Resume inside the click gesture, before the lazy audio module arrives (mobile Safari).
      const context = new AudioContext({ latencyHint: "interactive" })
      raw.current = context
      const resumed = context.resume()
      const [{ MetronomeAudio }] = await Promise.race([
        Promise.all([import("@/lib/metronome/audio"), resumed]),
        new Promise<never>((_, reject) => { deadline.current = setTimeout(() => reject(new Error("Audio timed out")), 10000) }),
      ])
      if (generation.current !== token) return
      if (deadline.current !== null) clearTimeout(deadline.current)
      deadline.current = null
      if (document.hidden || context.state !== "running") throw new Error("Audio unavailable")
      audio.current = new MetronomeAudio(context, latest.current, setBeat)
      context.onstatechange = () => {
        if (context.state !== "running" && raw.current === context) {
          stop(); setError("Zvuk je prekinut. Pokreni metronom ponovo.")
        }
      }
      starting.current = false; setPhase("playing"); activeChanged(true)
    } catch {
      if (generation.current !== token) return
      stop(); setError("Zvuk nije dostupan. Pokusaj ponovo ili koristi drugi pregledac.")
    }
  }
  function tap() {
    const result = tapTempo(taps.current, performance.now())
    taps.current = result.taps
    if (result.bpm !== null) update({ ...latest.current, bpm: result.bpm })
  }
  const active = phase !== "stopped"
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={id} onCancel={event => { event.preventDefault(); close() }}>
    <header className={styles.header}><h2 id={id}>{t("Metronom")}</h2><button type="button" className={styles.icon} onClick={hide} title={t("Sakrij panel")} aria-label={t("Sakrij panel")}><Minimize2 /></button><button type="button" className={styles.icon} onClick={close} title={t("Zatvori")} aria-label={t("Zatvori")}><X /></button></header>
    <div className={styles.pulses} aria-hidden="true">{Array.from({ length: settings.beats }, (_, index) => <span key={index} data-active={phase === "playing" && beat === index} data-accent={settings.accent && index === 0}>{index + 1}</span>)}</div>
    <label className={styles.tempo} htmlFor={id + "-bpm"}>{t("Tempo")} <span>BPM</span></label>
    <div className={styles.stepper}>
      <button type="button" className={styles.icon} aria-label={t("Smanji tempo")} title={t("Smanji tempo")} disabled={settings.bpm <= MIN_BPM} onClick={() => update({ ...settings, bpm: settings.bpm - 1 })}><Minus /></button>
      <input id={id + "-bpm"} aria-label={t("Tempo")} type="number" inputMode="numeric" min={MIN_BPM} max={MAX_BPM} step={1} value={bpmInput} onChange={event => {
        setBpmInput(event.target.value)
        if (event.target.value !== "") update({ ...settings, bpm: event.target.valueAsNumber })
      }} onBlur={event => {
        const value = event.currentTarget.valueAsNumber
        update({ ...latest.current, bpm: Number.isFinite(value) ? Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value))) : latest.current.bpm })
      }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur() }} />
      <button type="button" className={styles.icon} aria-label={t("Povecaj tempo")} title={t("Povecaj tempo")} disabled={settings.bpm >= MAX_BPM} onClick={() => update({ ...settings, bpm: settings.bpm + 1 })}><Plus /></button>
    </div>
    <input className={styles.slider} type="range" min={MIN_BPM} max={MAX_BPM} value={settings.bpm} aria-label={t("Tempo klizac")} onChange={event => update({ ...settings, bpm: Number(event.target.value) })} />
    <div className={styles.commands}>
      <button type="button" className={styles.play} aria-label={t(active ? "Zaustavi metronom" : "Pokreni metronom")} aria-pressed={active} onClick={() => active ? stop() : void start()}>{phase === "starting" ? <LoaderCircle /> : active ? <Square /> : <Play />}{t(active ? "Zaustavi" : "Pokreni")}</button>
      <button type="button" className={styles.tap} onClick={tap}><Hand />{t("Tap tempo")}</button>
    </div>
    <div className={styles.options}>
      <label htmlFor={id + "-beats"}>{t("Udaraca u taktu")}<select id={id + "-beats"} value={settings.beats} onChange={event => { setBeat(-1); update({ ...settings, beats: Number(event.target.value) }) }}>{Array.from({ length: 8 }, (_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}</select></label>
      <label className={styles.accent}><input type="checkbox" checked={settings.accent} onChange={event => update({ ...settings, accent: event.target.checked })} />{t("Naglasi prvi udarac")}</label>
      <label htmlFor={id + "-volume"}>{t("Glasnoca")}<output>{settings.volume}%</output><input id={id + "-volume"} type="range" min={0} max={100} value={settings.volume} onChange={event => update({ ...settings, volume: Number(event.target.value) })} /></label>
    </div>
    <p className={styles.status} role="status">{t(phase === "starting" ? "Pokrecem zvuk..." : phase === "playing" ? "Metronom radi" : "Metronom je zaustavljen")}</p>
    {error && <p className={styles.error} role="alert">{t(error)}</p>}
  </dialog>
}
