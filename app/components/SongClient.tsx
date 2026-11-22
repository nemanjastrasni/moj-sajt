"use client"

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react"
import { useEngagement } from "./Engagement"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, Maximize, Minus, Pause, Play, Plus, RotateCcw } from "lucide-react"
import UiText, { useI18n } from "./UiText"
import dynamic from "next/dynamic"
const UsedChordCard=dynamic(()=>import("./UsedChordCard"))
import SongSheet from "./SongSheet"
import CapoControl from "./CapoControl"
import useSongCapo from "./useSongCapo"
import useSongKey from "./useSongKey"
const PerformanceView=dynamic(()=>import("./PerformanceView"),{loading:()=> <p role="status"><UiText text="Učitavam alat..." /></p>})
import usePlaylistSongSettings from "./usePlaylistSongSettings"
import PlaylistSettingsStatus from "./PlaylistSettingsStatus"
import SongPerformers from "./SongPerformers"
import PlaylistSongNavigation from "./PlaylistSongNavigation"
import SongDisplayMode from "./SongDisplayMode"
import PlaylistDialog from "./PlaylistDialog"
import { getUsedChords, parseSongSheet } from "@/lib/chords/songSheet"
import { transposeChordSymbol } from "@/lib/chords/chordSymbols"
import type { SongPerformerView } from "@/lib/artists/performers"
import styles from "./SongToolbar.module.css"
const SongExtraTools = dynamic(() => import("./SongExtraTools"), { loading: () => <p role="status"><UiText text="Učitavam alat..." /></p> })

type Props = {
  adminTools?: ReactNode; fromFavorites?: boolean; performanceHref?: string; playlistId?: string; songVersion?: string; startPerformance?: boolean
  song: { id: string; title: string; artist: string; content?: string; lyrics?: string; chords?: string; category?: string; artistSlug?: string; artistName?: string; performers?: SongPerformerView[]; tutorial?: { videoId: string; title: string } | null }
  media?: { platform: string; embedUrl: string } | null
}

export default function SongClient({ song, adminTools, performanceHref, playlistId, songVersion, startPerformance = false }: Props) {
  const { t } = useI18n(), router = useRouter()
  const engagement = useEngagement()
  const recordUsage = engagement?.record
  useEffect(() => { if (playlistId) recordUsage?.({kind:"playlist_song",playlistId,songId:song.id}) }, [playlistId,song.id,recordUsage])
  const [performance, setPerformance] = useState(startPerformance), [lyricsOnly, setLyricsOnly] = useState(false)
  const original = useSongKey(song.id), playlistSettings = usePlaylistSongSettings(playlistId, song.id)
  const controls = playlistId ? playlistSettings : original, { transpose } = controls
  const [panel, setPanel] = useState<"settings" | null>(null)
  const [extraTools, setExtraTools] = useState({ open: false, loaded: false }), extraToolsId = useId()
  const extraToolsButton = useRef<HTMLButtonElement>(null)
  const [showVideo, setShowVideo] = useState(false), [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loadingVideo, setLoadingVideo] = useState(false), [videoError, setVideoError] = useState("")
  const [scrolling, setScrolling] = useState(false), [speed, setSpeed] = useState(1)
  const [showScrollControls, setShowScrollControls] = useState(false), scrollControlsId = useId()
  const [textSize, setTextSize] = useState(18), [chordSize, setChordSize] = useState(18), [showDiagrams, setShowDiagrams] = useState(false)
  const videoRequest = useRef<AbortController | null>(null)
  const { title, artist } = song, lyrics = song.lyrics || song.content || ""
  const sheetLines = useMemo(() => parseSongSheet(lyrics), [lyrics])
  const capo = useSongCapo(song.id, sheetLines, transpose, undefined, playlistId ? { value: playlistSettings.capo, change: playlistSettings.changeCapo } : undefined)
  const usedChords = useMemo(() => showDiagrams && !lyricsOnly ? getUsedChords(capo.lines).map(chord => transposeChordSymbol(chord, capo.shift)) : [], [showDiagrams, lyricsOnly, capo.lines, capo.shift])
  useEffect(() => {
    if (!scrolling) return
    // Keep fractional steps until a whole pixel is available: some browsers
    // round each scrollBy call, which otherwise leaves speeds 1 and 2 still.
    let remainder = 0
    const timer = setInterval(() => {
      remainder += speed * .2
      const distance = Math.floor(remainder)
      if (distance > 0) { window.scrollBy(0, distance); remainder -= distance }
    }, 60)
    return () => clearInterval(timer)
  }, [scrolling, speed])
  useEffect(() => () => { videoRequest.current?.abort(); videoRequest.current = null }, [])
  async function toggleVideo() {
    setPanel(null)
    if (videoUrl) { setShowVideo(value => !value); return }
    if (videoRequest.current) return
    const controller = new AbortController(); videoRequest.current = controller
    setLoadingVideo(true); setVideoError("")
    const timer = setTimeout(() => controller.abort(), 15000)
    try {
      const response = await fetch(`/api/youtube?song=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`, { signal: controller.signal })
      const data = await response.json()
      if (!response.ok || typeof data?.embedUrl !== "string" || !/^https:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/[a-zA-Z0-9_-]+(?:\?.*)?$/.test(data.embedUrl)) throw Error("Video trenutno nije dostupan.")
      setVideoUrl(data.embedUrl); setShowVideo(true)
    } catch { if (videoRequest.current === controller) setVideoError("Video trenutno nije dostupan.") }
    finally { clearTimeout(timer); if (videoRequest.current === controller) { videoRequest.current = null; setLoadingVideo(false) } }
  }
  return <div className={styles.page}>
    {playlistId && <PlaylistSongNavigation playlistId={playlistId} songId={song.id} />}
    <div className={styles.heading}><h1 translate="no">{title}</h1></div>
    {adminTools}
    {song.performers && song.performers.length >= 2 ? <SongPerformers artists={song.performers} /> : song.artistSlug ? <Link href={`/pesme/${song.category}/${song.artistSlug}`} className={styles.artist} translate="no">{artist}</Link> : <p className={styles.artist}>{artist}</p>}
    <div className={styles.toolbar} aria-label={t("Kontrole pesme")} data-song-toolbar>
      <SongDisplayMode lyricsOnly={lyricsOnly} change={setLyricsOnly} />
      {!lyricsOnly && <div className={styles.key}>
        <span>{t("Ton")}</span>
        <button type="button" className={styles.icon} disabled={controls.controlsDisabled || transpose <= -11} aria-label={t("Smanji tonalitet")} title={t("Smanji tonalitet")} onClick={() => controls.change(value => Math.max(-11, value - 1))}><Minus /></button>
        <output aria-label={t("Transpozicija")}>{transpose > 0 ? `+${transpose}` : transpose}</output>
        <button type="button" className={styles.icon} disabled={controls.controlsDisabled || transpose >= 11} aria-label={t("Povecaj tonalitet")} title={t("Povecaj tonalitet")} onClick={() => controls.change(value => Math.min(11, value + 1))}><Plus /></button>
        <button type="button" className={styles.icon} disabled={controls.controlsDisabled} aria-label={t("Originalni tonalitet")} title={t("Originalni tonalitet")} onClick={() => controls.change(0)}><RotateCcw /></button>
      </div>}
      {!lyricsOnly && <div className={styles.capo}><CapoControl dialog key={song.id} capo={capo} disabled={controls.controlsDisabled} /></div>}
      <button type="button" className={styles.icon} aria-pressed={scrolling} aria-controls={showScrollControls ? scrollControlsId : undefined} aria-label={t(scrolling ? "Zaustavi skrolovanje" : "Pokreni skrolovanje")} title={t(scrolling ? "Zaustavi skrolovanje" : "Pokreni skrolovanje")} onClick={() => { setShowScrollControls(true); setScrolling(value => !value) }}>{scrolling ? <Pause /> : <Play />}</button>
      <button type="button" className={styles.icon} disabled={controls.controlsDisabled} title={t("Rezim za sviranje")} aria-label={t("Rezim za sviranje")} onClick={async () => { if (performanceHref && !await playlistSettings.canLeave()) return; setScrolling(false); setShowVideo(false); if (performanceHref) router.push(performanceHref); else setPerformance(true) }}><Maximize /></button>
      <button ref={extraToolsButton} type="button" className={styles.moreTools} aria-label={t("Dodatni alati pesme")} aria-expanded={extraTools.open} aria-controls={extraToolsId} onClick={() => setExtraTools(current => ({ open: !current.open, loaded: true }))}>
        {t(extraTools.open ? "Sakrij alate" : "Još alata")}<ChevronDown aria-hidden="true" />
      </button>
      <div id={extraToolsId} className={styles.extraTools} hidden={!extraTools.open} data-song-extra-tools onKeyDown={event => {
        if (event.key === "Escape" && !event.defaultPrevented && !(event.target instanceof Element && event.target.closest("dialog[open]"))) {
          setExtraTools(current => ({ ...current, open: false })); extraToolsButton.current?.focus()
        }
      }}>
        {extraTools.loaded && <SongExtraTools song={{ id: song.id, title, artist, lyrics, tutorial: song.tutorial }} songVersion={songVersion} disabled={controls.controlsDisabled} transpose={transpose} capo={capo.active ? capo.selected : null} textSize={textSize} chordSize={chordSize}
          showVideo={showVideo} loadingVideo={loadingVideo} toggleVideo={() => void toggleVideo()} openSettings={() => setPanel("settings")} onTutorialPlay={() => { setScrolling(false); setShowVideo(false) }} />}
      </div>
      {showScrollControls && <div id={scrollControlsId} className={styles.scrollControls} data-song-scroll-controls>
        <label><span>{t("Brzina skrolovanja")}<output>{speed}/10</output></span><input type="range" min="1" max="10" value={speed} aria-label={t("Brzina skrolovanja")} onChange={event => setSpeed(Number(event.target.value))} /></label>
      </div>}
    </div>
    {playlistId && <PlaylistSettingsStatus controls={playlistSettings} />}
    {videoError && <p role="status" className={styles.error}>{t(videoError)}</p>}
    <div className={showVideo && videoUrl ? styles.withVideo : undefined}>
      <div className={styles.content}>
        {showDiagrams && !lyricsOnly && <div className={styles.diagrams}>{usedChords.map(chord => <UsedChordCard key={chord} chord={chord} />)}</div>}
        {playlistId && playlistSettings.phase === "loading" ? <p role="status">{t("Ucitavam podesavanja playliste...")}</p> : <SongSheet lines={capo.lines} transpose={capo.shift} textSize={textSize} chordSize={chordSize} lyricsOnly={lyricsOnly} />}
      </div>
      {showVideo && videoUrl && <aside className={styles.video}><iframe loading="lazy" src={videoUrl} title="YouTube player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></aside>}
    </div>
    {panel === "settings" && <PlaylistDialog title="Podesavanja prikaza" close={() => setPanel(null)}><div className={styles.settings}>
      <label>{t("Velicina teksta")}<input type="range" min="14" max="32" value={textSize} aria-label={t("Velicina teksta")} onChange={event => setTextSize(Number(event.target.value))} /></label>
      {!lyricsOnly && <><label>{t("Velicina akorda")}<input type="range" min="14" max="32" value={chordSize} aria-label={t("Velicina akorda")} onChange={event => setChordSize(Number(event.target.value))} /></label><label className={styles.check}><input type="checkbox" checked={showDiagrams} onChange={event => setShowDiagrams(event.target.checked)} />{t("Prikazi hvatove akorda")}</label></>}
    </div></PlaylistDialog>}
    {performance && <PerformanceView displayMode={{ lyricsOnly, change: setLyricsOnly }} playlistId={playlistId} song={{ id: song.id, title, artist, lyrics }} controls={controls} capoControl={capo} settingsTools={playlistId ? <PlaylistSettingsStatus controls={playlistSettings} /> : <></>} leaveGuard={playlistId ? playlistSettings.canLeave : undefined} close={() => setPerformance(false)} />}
  </div>
}
