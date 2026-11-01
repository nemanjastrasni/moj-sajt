"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode, type TouchEvent as ReactTouchEvent } from "react"
import { ChevronLeft, ChevronRight, Maximize, Minimize, Minus, Pause, Play, Plus, RotateCcw, SlidersHorizontal, X } from "lucide-react"
import { parseSongSheet } from "@/lib/chords/songSheet"
import type { PerformanceSong } from "@/lib/performance/model"
import { performanceSwipeDirection } from "@/lib/performance/swipe"
import SongSheet from "./SongSheet"
import FavoriteTransposeStatus from "./FavoriteTransposeStatus"
import MetronomeButton from "./MetronomeButton"
import TunerButton from "./TunerButton"
import CapoControl from "./CapoControl"
import useSongCapo, { type SongCapo } from "./useSongCapo"
import useRememberPerformance from "./useRememberPerformance"
import { useI18n } from "./UiText"
import styles from "./PerformanceView.module.css"
import SongDisplayMode from "./SongDisplayMode"

type KeyControls = { transpose: number; phase: string; error: string; controlsDisabled: boolean; change: (value: number | ((current: number) => number)) => void; reload: () => Promise<void> }
type Props = { song: PerformanceSong | null; controls: KeyControls; capoControl?: SongCapo; initialCapo?: { id: string; fret: number }; playlistId?: string; settingsTools?: ReactNode; leaveGuard?: () => boolean | Promise<boolean>; close: () => void; loading?: boolean; error?: string; retry?: () => void; previous?: () => void; next?: () => void; position?: number; total?: number; name?: string; displayMode?: { lyricsOnly: boolean; change: (value: boolean) => void } }
export default function PerformanceView({ song, controls, capoControl, initialCapo, playlistId, settingsTools, leaveGuard, close, loading = false, error = "", retry, previous, next, position, total, name, displayMode }: Props) {
  const { t } = useI18n(), dialog = useRef<HTMLDialogElement>(null), screen = useRef<HTMLDivElement>(null), scroll = useRef<HTMLDivElement>(null)
  const [fullscreen, setFullscreen] = useState(false), [notice, setNotice] = useState(""), [settings, setSettings] = useState(false)
  const [controlsOpen, setControlsOpen] = useState(false), controlsId = useId()
  const controlsPanel = useRef<HTMLDivElement>(null), controlsButton = useRef<HTMLButtonElement>(null)
  const swipe = useRef<{ touchId: number; songId: string; x: number; y: number; at: number; scrollTop: number; dismissedControls: boolean } | null>(null)
  const dismissedByTouch = useRef(false)
  const [textSize, setTextSize] = useState(20), [chordSize, setChordSize] = useState(20), [speed, setSpeed] = useState(3)
  const [ownLyricsOnly, setOwnLyricsOnly] = useState(false)
  const [navigating, setNavigating] = useState(false), leaving = useRef(false)
  const lyricsOnly = displayMode?.lyricsOnly ?? ownLyricsOnly
  const [transport, setTransport] = useState({ id: song?.id, loading, playing: false })
  const sameSong = transport.id === song?.id && transport.loading === loading
  if (!sameSong) { setTransport({ id: song?.id, loading, playing: false }); setControlsOpen(false) }
  const playing = sameSong && transport.playing
  const setPlaying = useCallback((value: boolean) => setTransport({ id: song?.id, loading, playing: value }), [song?.id, loading])
  const sheet = useMemo(() => parseSongSheet(song?.lyrics ?? ""), [song?.lyrics])
  const ownCapo = useSongCapo(song?.id ?? "", sheet, controls.transpose, initialCapo)
  const capo = capoControl ?? ownCapo
  useRememberPerformance(song?.id, playlistId, loading || Boolean(error))
  const saving = ["saving", "updating"].includes(controls.phase)
  const navigationDisabled = loading || navigating || saving && !leaveGuard
  const disabled = loading || navigating || !song || controls.controlsDisabled
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
    const element = scroll.current
    if (!element) return
    const track = (event: TouchEvent) => {
      const origin = swipe.current, touch = event.touches[0]
      if (!origin) return
      if (event.touches.length !== 1 || touch.identifier !== origin.touchId) { swipe.current = null; return }
      const dx = Math.abs(touch.clientX - origin.x), dy = Math.abs(touch.clientY - origin.y)
      if (dy > 12 && dy > dx || Math.abs(element.scrollTop - origin.scrollTop) > 6) { swipe.current = null; return }
      // Claim only deliberate song swipes; leave vertical/pinch/tab scrolling native.
      if (dx > 12 && dx > dy * 2 && event.cancelable) event.preventDefault()
    }
    element.addEventListener("touchmove", track, { passive: false })
    return () => element.removeEventListener("touchmove", track)
  }, [])
  useEffect(() => {
    if (!controlsOpen) return
    if (controlsButton.current?.getClientRects().length) controlsPanel.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus()
    const dismiss = (event: Event) => {
      if (event.target instanceof Node && !controlsPanel.current?.contains(event.target) && !controlsButton.current?.contains(event.target)) {
        if (event instanceof PointerEvent && event.pointerType === "touch") dismissedByTouch.current = true
        setControlsOpen(false)
      }
    }
    document.addEventListener("pointerdown", dismiss)
    document.addEventListener("focusin", dismiss)
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("focusin", dismiss) }
  }, [controlsOpen])
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
  async function navigate(action: () => void | Promise<void>) {
    if (leaving.current || navigationDisabled) return
    leaving.current = true; setNavigating(true)
    try {
      if (leaveGuard && !await leaveGuard()) return
      setPlaying(false)
      await action()
    } finally { leaving.current = false; setNavigating(false) }
  }
  function startSwipe(event: ReactTouchEvent<HTMLDivElement>) {
    const dismissedControls = dismissedByTouch.current || controlsOpen
    dismissedByTouch.current = false
    setPlaying(false)
    swipe.current = null
    if (event.touches.length !== 1 || navigationDisabled || !song || error || (!previous && !next)) return
    if (window.getSelection()?.isCollapsed === false) return
    const target = event.target
    if (!(target instanceof Element) || target.closest('a, button, input, select, textarea, [role="button"], [role="slider"], [contenteditable="true"]')) return
    // Leave horizontal tablature/long-line scrolling to the browser.
    for (let node: Element | null = target; node && node !== event.currentTarget; node = node.parentElement) {
      if (node.scrollWidth > node.clientWidth + 2 && /^(auto|scroll)$/.test(getComputedStyle(node).overflowX)) return
    }
    const touch = event.touches[0]
    // The edges belong to the phone/browser's back and forward gestures.
    if (touch.clientX < 16 || touch.clientX > window.innerWidth - 16) return
    swipe.current = { touchId: touch.identifier, songId: song.id, x: touch.clientX, y: touch.clientY, at: performance.now(), scrollTop: event.currentTarget.scrollTop, dismissedControls }
  }
  function finishSwipe(event: ReactTouchEvent<HTMLDivElement>) {
    const origin = swipe.current
    swipe.current = null
    dismissedByTouch.current = false
    if (!origin || origin.dismissedControls || event.touches.length || navigationDisabled || controlsOpen || !song || error || origin.songId !== song.id) return
    if (Math.abs(event.currentTarget.scrollTop - origin.scrollTop) > 6 || window.getSelection()?.isCollapsed === false) return
    const touch = Array.from(event.changedTouches).find(value => value.identifier === origin.touchId)
    if (!touch) return
    const direction = performanceSwipeDirection({ startX: origin.x, startY: origin.y, endX: touch.clientX, endY: touch.clientY, elapsed: performance.now() - origin.at, width: event.currentTarget.clientWidth })
    const action = direction === "next" ? next : direction === "previous" ? previous : undefined
    if (action) void navigate(action)
  }
  function leave() {
    void navigate(async () => {
      if (document.fullscreenElement === screen.current) await document.exitFullscreen().catch(() => {})
      close()
    })
  }
  function hideControls() {
    setControlsOpen(false)
    if (controlsButton.current?.getClientRects().length) controlsButton.current.focus()
  }
  async function toggleFullscreen() {
    setNotice("")
    try {
      if (document.fullscreenElement === screen.current) { await document.exitFullscreen(); hideControls() }
      else if (screen.current?.requestFullscreen) { await screen.current.requestFullscreen(); hideControls() }
      else setNotice("Pregledac ne podrzava fullscreen. Rezim sviranja ostaje otvoren.")
    } catch { setNotice("Pregledac ne podrzava fullscreen. Rezim sviranja ostaje otvoren.") }
  }
  return <dialog ref={dialog} className={styles.dialog} aria-label={t("Rezim za sviranje")} onKeyDown={event => {
    if (event.key === "Escape" && !event.defaultPrevented && controlsOpen && controlsButton.current?.getClientRects().length && event.target instanceof Element && event.target.closest("dialog") === event.currentTarget) {
      event.preventDefault(); event.stopPropagation(); hideControls()
    }
  }} onCancel={event => {
    if (event.target !== event.currentTarget) return
    event.preventDefault()
    if (controlsOpen && controlsButton.current?.getClientRects().length) hideControls()
    else leave()
  }}>
    <div ref={screen} className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.top}>
          <div className={styles.identity}><h1 translate="no" title={song?.title ?? name}>{song?.title ?? name ?? t("Rezim za sviranje")}</h1>{song && <p translate="no" title={song.artist}>{song.artist}</p>}</div>
          <div className={styles.actions}>
            <button type="button" className={`${styles.icon} ${styles.desktopAction}`} aria-label={t("Podesavanja prikaza")} title={t("Podesavanja prikaza")} aria-expanded={settings} onClick={() => setSettings(value => !value)}><SlidersHorizontal /></button>
            <button type="button" className={`${styles.icon} ${styles.desktopAction}`} aria-label={t(fullscreen ? "Izadji iz celog ekrana" : "Ceo ekran")} title={t(fullscreen ? "Izadji iz celog ekrana" : "Ceo ekran")} onClick={() => void toggleFullscreen()}>{fullscreen ? <Minimize /> : <Maximize />}</button>
            <button ref={controlsButton} type="button" className={`${styles.icon} ${styles.mobileMenu}`} aria-label={t("Kontrole pesme")} title={t("Kontrole pesme")} aria-expanded={controlsOpen} aria-controls={controlsId} onClick={() => setControlsOpen(value => !value)}><SlidersHorizontal /></button>
            <button type="button" className={styles.icon} aria-label={t("Zatvori")} title={t("Zatvori")} disabled={navigationDisabled} onClick={leave}><X /></button>
          </div>
        </div>
        <div ref={controlsPanel} id={controlsId} className={styles.controls} data-open={controlsOpen} role="region" aria-label={t("Kontrole pesme")}>
        <div className={styles.toolbar}>
          <SongDisplayMode lyricsOnly={lyricsOnly} change={displayMode?.change ?? setOwnLyricsOnly} />
          {!lyricsOnly && <div className={styles.keyControls}><span className={styles.small}>{t("Ton")}</span>
          <button type="button" className={styles.icon} disabled={disabled || controls.transpose <= -11} title={t("Smanji tonalitet")} aria-label={t("Smanji tonalitet")} onClick={() => controls.change(value => Math.max(-11, value - 1))}><Minus /></button>
          <output className={styles.key} aria-label={t("Transpozicija")}>{controls.transpose > 0 ? "+" : ""}{controls.transpose}</output>
          <button type="button" className={styles.icon} disabled={disabled || controls.transpose >= 11} title={t("Povecaj tonalitet")} aria-label={t("Povecaj tonalitet")} onClick={() => controls.change(value => Math.min(11, value + 1))}><Plus /></button>
          <button type="button" className={styles.icon} disabled={disabled} title={t("Originalni tonalitet")} aria-label={t("Originalni tonalitet")} onClick={() => controls.change(0)}><RotateCcw /></button></div>}
          <div className={styles.audioControls}><button type="button" className={styles.icon} disabled={loading || !song} title={t(playing ? "Zaustavi skrolovanje" : "Pokreni skrolovanje")} aria-label={t(playing ? "Zaustavi skrolovanje" : "Pokreni skrolovanje")} aria-pressed={playing} onClick={() => { setPlaying(!playing); hideControls() }}>{playing ? <Pause /> : <Play />}</button>
          <TunerButton /><MetronomeButton /></div>
          {!lyricsOnly && <CapoControl key={song?.id} capo={capo} disabled={disabled} />}
          <button type="button" className={`${styles.button} ${styles.mobileFullscreen}`} onClick={() => void toggleFullscreen()}>{fullscreen ? <Minimize /> : <Maximize />}{t(fullscreen ? "Izadji iz celog ekrana" : "Ceo ekran")}</button>
          {song && (settingsTools ?? <FavoriteTransposeStatus phase={controls.phase} error={controls.error} reload={controls.reload} />)}
        </div>
        <div className={styles.settings} data-expanded={settings}>
          <label>{t("Velicina teksta")}<input type="range" min={14} max={32} value={textSize} onChange={event => setTextSize(Number(event.target.value))} /></label>
          <label>{t("Velicina akorda")}<input type="range" min={14} max={32} value={chordSize} disabled={lyricsOnly} onChange={event => setChordSize(Number(event.target.value))} /></label>
          <label>{t("Brzina skrolovanja")}<input type="range" min={1} max={10} value={speed} onChange={event => setSpeed(Number(event.target.value))} /></label>
        </div>
        {notice && <p role="status" className={styles.small}>{t(notice)}</p>}
        </div>
      </header>
      <div ref={scroll} className={styles.content} tabIndex={0} aria-label={t("Tekst pesme")} onWheel={() => setPlaying(false)} onTouchStart={startSwipe} onTouchEnd={finishSwipe} onTouchCancel={() => { swipe.current = null; dismissedByTouch.current = false }}>
        {loading ? <p role="status">{t("Ucitavam pesmu...")}</p> : error ? <div role="alert"><p>{t(error)}</p>{retry && <button type="button" className={styles.button} onClick={retry}>{t("Pokusaj ponovo")}</button>}</div> : song && <SongSheet lines={capo.lines} transpose={capo.shift} textSize={textSize} chordSize={chordSize} lyricsOnly={lyricsOnly} />}
      </div>
      {total !== undefined && <nav className={styles.navigation} aria-label={t("Pesme u playlisti")}>
        <button type="button" className={styles.button} disabled={!previous || navigationDisabled} onClick={() => void navigate(() => previous?.())}><ChevronLeft />{t("Prethodna")}</button>
        <span aria-live="polite">{position === undefined ? "-" : position + 1} / {total}</span>
        <button type="button" className={styles.button} disabled={!next || navigationDisabled} onClick={() => void navigate(() => next?.())}>{t("Sledeca")}<ChevronRight /></button>
      </nav>}
    </div>
  </dialog>
}
