"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Maximize, Minimize, Minus, Pause, Play, Plus, RotateCcw, SlidersHorizontal, X } from "lucide-react"
import { parseSongSheet } from "@/lib/chords/songSheet"
import type { PerformanceSong } from "@/lib/performance/model"
import type useFavoriteSong from "./useFavoriteSong"
import SongSheet from "./SongSheet"
import FavoriteTransposeStatus from "./FavoriteTransposeStatus"
import MetronomeButton from "./MetronomeButton"
import TunerButton from "./TunerButton"
import CapoControl from "./CapoControl"
import useSongCapo, { type SongCapo } from "./useSongCapo"
import useRememberPerformance from "./useRememberPerformance"
import { useI18n } from "./UiText"
import styles from "./PerformanceView.module.css"

type KeyControls = Pick<ReturnType<typeof useFavoriteSong>, "transpose" | "phase" | "error" | "controlsDisabled" | "change" | "reload">
type Props = { song: PerformanceSong | null; controls: KeyControls; capoControl?: SongCapo; initialCapo?: { id: string; fret: number }; playlistId?: string; close: () => void; loading?: boolean; error?: string; retry?: () => void; previous?: () => void; next?: () => void; position?: number; total?: number; name?: string }
export default function PerformanceView({ song, controls, capoControl, initialCapo, playlistId, close, loading = false, error = "", retry, previous, next, position, total, name }: Props) {
  const { t } = useI18n(), dialog = useRef<HTMLDialogElement>(null), screen = useRef<HTMLDivElement>(null), scroll = useRef<HTMLDivElement>(null)
  const [fullscreen, setFullscreen] = useState(false), [notice, setNotice] = useState(""), [settings, setSettings] = useState(false)
  const [textSize, setTextSize] = useState(20), [chordSize, setChordSize] = useState(20), [speed, setSpeed] = useState(3)
  const [transport, setTransport] = useState({ id: song?.id, loading, playing: false })
  const sameSong = transport.id === song?.id && transport.loading === loading
  if (!sameSong) setTransport({ id: song?.id, loading, playing: false })
  const playing = sameSong && transport.playing
  const setPlaying = useCallback((value: boolean) => setTransport({ id: song?.id, loading, playing: value }), [song?.id, loading])
  const sheet = useMemo(() => parseSongSheet(song?.lyrics ?? ""), [song?.lyrics])
  const ownCapo = useSongCapo(song?.id ?? "", sheet, controls.transpose, initialCapo)
  const capo = capoControl ?? ownCapo
  useRememberPerformance(song?.id, playlistId, loading || Boolean(error))
  const saving = ["saving", "updating"].includes(controls.phase)
  const disabled = loading || !song || controls.controlsDisabled
  useEffect(() => {
    const element = dialog.current, trigger = document.activeElement, oldOverflow = document.body.style.overflow
    element?.showModal(); document.body.style.overflow = "hidden"
    return () => { element?.close(); document.body.style.overflow = oldOverflow; if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus() }
  }, [])
  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === screen.current)
    document.addEventListener("fullscreenchange", update)
    return () => document.removeEventListener("fullscreenchange", update)
  }, [])
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = 0 }, [song?.id, loading])
  useEffect(() => {
    const pause = () => { if (document.hidden) setPlaying(false) }
    document.addEventListener("visibilitychange", pause)
    return () => document.removeEventListener("visibilitychange", pause)
  }, [setPlaying])
  useEffect(() => {
    if (!playing || loading || !song) return
    const element = scroll.current
    if (!element) return
    let frame = 0, previousTime = 0, position = element.scrollTop
    const advance = (time: number) => {
      if (previousTime) position += Math.min(100, time - previousTime) * speed * .008
      previousTime = time; element.scrollTop = position
      if (element.scrollTop + element.clientHeight >= element.scrollHeight - 1) { setPlaying(false); return }
      frame = requestAnimationFrame(advance)
    }
    frame = requestAnimationFrame(advance)
    return () => cancelAnimationFrame(frame)
  }, [playing, speed, loading, song, setPlaying])
  function leave() {
    if (saving) return
    setPlaying(false)
    if (document.fullscreenElement === screen.current) void document.exitFullscreen().catch(() => {}).finally(close)
    else close()
  }
  async function toggleFullscreen() {
    setNotice("")
    try {
      if (document.fullscreenElement === screen.current) await document.exitFullscreen()
      else if (screen.current?.requestFullscreen) await screen.current.requestFullscreen()
      else setNotice("Pregledac ne podrzava fullscreen. Rezim sviranja ostaje otvoren.")
    } catch { setNotice("Pregledac ne podrzava fullscreen. Rezim sviranja ostaje otvoren.") }
  }
  return <dialog ref={dialog} className={styles.dialog} aria-label={t("Rezim za sviranje")} onCancel={event => { event.preventDefault(); leave() }}>
    <div ref={screen} className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.top}>
          <div className={styles.identity}><h1 translate="no" title={song?.title ?? name}>{song?.title ?? name ?? t("Rezim za sviranje")}</h1>{song && <p translate="no" title={song.artist}>{song.artist}</p>}</div>
          <div className={styles.actions}>
            <button type="button" className={styles.icon} aria-label={t("Podesavanja prikaza")} title={t("Podesavanja prikaza")} aria-expanded={settings} onClick={() => setSettings(value => !value)}><SlidersHorizontal /></button>
            <button type="button" className={styles.icon} aria-label={t(fullscreen ? "Izadji iz celog ekrana" : "Ceo ekran")} title={t(fullscreen ? "Izadji iz celog ekrana" : "Ceo ekran")} onClick={() => void toggleFullscreen()}>{fullscreen ? <Minimize /> : <Maximize />}</button>
            <button type="button" className={styles.icon} aria-label={t("Zatvori")} title={t("Zatvori")} disabled={saving} onClick={leave}><X /></button>
          </div>
        </div>
        <div className={styles.toolbar}>
          <span className={styles.small}>{t("Ton")}</span>
          <button type="button" className={styles.icon} disabled={disabled || controls.transpose <= -11} title={t("Smanji tonalitet")} aria-label={t("Smanji tonalitet")} onClick={() => controls.change(value => Math.max(-11, value - 1))}><Minus /></button>
          <output className={styles.key} aria-label={t("Transpozicija")}>{controls.transpose > 0 ? "+" : ""}{controls.transpose}</output>
          <button type="button" className={styles.icon} disabled={disabled || controls.transpose >= 11} title={t("Povecaj tonalitet")} aria-label={t("Povecaj tonalitet")} onClick={() => controls.change(value => Math.min(11, value + 1))}><Plus /></button>
          <button type="button" className={styles.icon} disabled={disabled} title={t("Originalni tonalitet")} aria-label={t("Originalni tonalitet")} onClick={() => controls.change(0)}><RotateCcw /></button>
          <button type="button" className={styles.icon} disabled={loading || !song} title={t(playing ? "Zaustavi skrolovanje" : "Pokreni skrolovanje")} aria-label={t(playing ? "Zaustavi skrolovanje" : "Pokreni skrolovanje")} aria-pressed={playing} onClick={() => setPlaying(!playing)}>{playing ? <Pause /> : <Play />}</button>
          <TunerButton /><MetronomeButton />
          <CapoControl key={song?.id} capo={capo} disabled={disabled} />
          {song && <FavoriteTransposeStatus phase={controls.phase} error={controls.error} reload={controls.reload} />}
        </div>
        {settings && <div className={styles.settings}>
          <label>{t("Velicina teksta")}<input type="range" min={14} max={32} value={textSize} onChange={event => setTextSize(Number(event.target.value))} /></label>
          <label>{t("Velicina akorda")}<input type="range" min={14} max={32} value={chordSize} onChange={event => setChordSize(Number(event.target.value))} /></label>
          <label>{t("Brzina skrolovanja")}<input type="range" min={1} max={10} value={speed} onChange={event => setSpeed(Number(event.target.value))} /></label>
        </div>}
        {notice && <p role="status" className={styles.small}>{t(notice)}</p>}
      </header>
      <div ref={scroll} className={styles.content} tabIndex={0} aria-label={t("Tekst pesme")} onWheel={() => setPlaying(false)} onTouchStart={() => setPlaying(false)}>
        {loading ? <p role="status">{t("Ucitavam pesmu...")}</p> : error ? <div role="alert"><p>{t(error)}</p>{retry && <button type="button" className={styles.button} onClick={retry}>{t("Pokusaj ponovo")}</button>}</div> : song && <SongSheet lines={capo.lines} transpose={capo.shift} textSize={textSize} chordSize={chordSize} />}
      </div>
      {total !== undefined && <nav className={styles.navigation} aria-label={t("Pesme u playlisti")}>
        <button type="button" className={styles.button} disabled={!previous || loading || saving} onClick={previous}><ChevronLeft />{t("Prethodna")}</button>
        <span aria-live="polite">{position === undefined ? "-" : position + 1} / {total}</span>
        <button type="button" className={styles.button} disabled={!next || loading || saving} onClick={next}>{t("Sledeca")}<ChevronRight /></button>
      </nav>}
    </div>
  </dialog>
}
