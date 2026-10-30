"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Maximize, Minus, MoreHorizontal, Pause, Play, Plus, RotateCcw, Settings2, Video } from "lucide-react"
import { useI18n } from "./UiText"
import UsedChordCard from "./UsedChordCard"
import SongSheet from "./SongSheet"
import SongPdfButton from "./SongPdfButton"
import SongPlaylistButton from "./SongPlaylistButton"
import SongReportButton from "./SongReportButton"
import CapoControl from "./CapoControl"
import useSongCapo from "./useSongCapo"
import useSongKey from "./useSongKey"
import PerformanceView from "./PerformanceView"
import usePlaylistSongSettings from "./usePlaylistSongSettings"
import PlaylistSettingsStatus from "./PlaylistSettingsStatus"
import SongPerformers from "./SongPerformers"
import PlaylistSongNavigation from "./PlaylistSongNavigation"
import SongDisplayMode from "./SongDisplayMode"
import SongTutorial from "./SongTutorial"
import PlaylistDialog from "./PlaylistDialog"
import { getUsedChords, parseSongSheet } from "@/lib/chords/songSheet"
import { transposeChordSymbol } from "@/lib/chords/chordSymbols"
import type { SongPerformerView } from "@/lib/artists/performers"
import styles from "./SongToolbar.module.css"

type Props = {
  adminTools?: ReactNode; fromFavorites?: boolean; performanceHref?: string; playlistId?: string; songVersion?: string; startPerformance?: boolean
  song: { id: string; title: string; artist: string; content?: string; lyrics?: string; chords?: string; category?: string; artistSlug?: string; artistName?: string; performers?: SongPerformerView[] }
  media?: { platform: string; embedUrl: string } | null
}

export default function SongClient({ song, adminTools, performanceHref, playlistId, songVersion, startPerformance = false }: Props) {
  const { t } = useI18n(), router = useRouter()
  const [performance, setPerformance] = useState(startPerformance), [lyricsOnly, setLyricsOnly] = useState(false)
  const original = useSongKey(song.id), playlistSettings = usePlaylistSongSettings(playlistId, song.id)
  const controls = playlistId ? playlistSettings : original, { transpose } = controls
  const [panel, setPanel] = useState<"settings" | "more" | null>(null)
  const [showVideo, setShowVideo] = useState(false), [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loadingVideo, setLoadingVideo] = useState(false), [videoError, setVideoError] = useState("")
  const [scrolling, setScrolling] = useState(false), [speed, setSpeed] = useState(1)
  const [textSize, setTextSize] = useState(18), [chordSize, setChordSize] = useState(18), [showDiagrams, setShowDiagrams] = useState(false)
  const videoRequest = useRef<AbortController | null>(null)
  const { title, artist } = song, lyrics = song.lyrics || song.content || ""
  const sheetLines = useMemo(() => parseSongSheet(lyrics), [lyrics])
  const capo = useSongCapo(song.id, sheetLines, transpose, undefined, playlistId ? { value: playlistSettings.capo, change: playlistSettings.changeCapo } : undefined)
  const usedChords = useMemo(() => getUsedChords(capo.lines).map(chord => transposeChordSymbol(chord, capo.shift)), [capo.lines, capo.shift])
  useEffect(() => {
    if (!scrolling) return
    const timer = setInterval(() => window.scrollBy(0, speed * .2), 60)
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
      <button type="button" className={styles.icon} aria-pressed={scrolling} aria-label={t(scrolling ? "Zaustavi skrolovanje" : "Pokreni skrolovanje")} title={t(scrolling ? "Zaustavi skrolovanje" : "Pokreni skrolovanje")} onClick={() => setScrolling(value => !value)}>{scrolling ? <Pause /> : <Play />}</button>
      <button type="button" className={styles.icon} disabled={controls.controlsDisabled} title={t("Rezim za sviranje")} aria-label={t("Rezim za sviranje")} onClick={async () => { if (performanceHref && !await playlistSettings.canLeave()) return; setScrolling(false); setShowVideo(false); if (performanceHref) router.push(performanceHref); else setPerformance(true) }}><Maximize /></button>
      <SongPlaylistButton key={song.id} songId={song.id} disabled={controls.controlsDisabled} settings={{ transpose, capo: capo.active ? capo.selected : null }} />
      <SongPdfButton song={{ id: song.id, title, artist, lyrics }} transpose={transpose} capo={capo.active ? capo.selected : null} disabled={controls.controlsDisabled} textSize={textSize} chordSize={chordSize} />
      <SongTutorial songId={song.id} mode="user" onPlay={() => { setScrolling(false); setShowVideo(false) }} />
      <button type="button" className={styles.icon} title={t("Podesavanja prikaza")} aria-label={t("Podesavanja prikaza")} aria-haspopup="dialog" onClick={() => setPanel("settings")}><Settings2 /></button>
      <button type="button" className={styles.icon} title={t("Jos opcija")} aria-label={t("Jos opcija")} aria-haspopup="dialog" onClick={() => setPanel("more")}><MoreHorizontal /></button>
    </div>
    {playlistId && <PlaylistSettingsStatus controls={playlistSettings} />}
    <div className={styles.heading}><h1 translate="no">{title}</h1></div>
    {adminTools}
    {song.performers && song.performers.length >= 2 ? <SongPerformers artists={song.performers} /> : song.artistSlug ? <Link href={`/pesme/${song.category}/${song.artistSlug}`} className={styles.artist} translate="no">{artist}</Link> : <p className={styles.artist}>{artist}</p>}
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
      <label>{t("Brzina skrolovanja")}<input type="range" min="1" max="10" value={speed} aria-label={t("Brzina skrolovanja")} onChange={event => setSpeed(Number(event.target.value))} /></label>
    </div></PlaylistDialog>}
    {panel === "more" && <PlaylistDialog title="Jos opcija" close={() => setPanel(null)}><div className={styles.more}>
      <button type="button" className="ui-button" disabled={loadingVideo} aria-pressed={showVideo} onClick={() => void toggleVideo()}><Video />{t(showVideo ? "Sakrij video" : "Prikazi video")}</button>
      {songVersion && <SongReportButton songId={song.id} songVersion={songVersion} title={title} artist={artist} transpose={transpose} />}
    </div></PlaylistDialog>}
    {performance && <PerformanceView displayMode={{ lyricsOnly, change: setLyricsOnly }} playlistId={playlistId} song={{ id: song.id, title, artist, lyrics }} controls={controls} capoControl={capo} settingsTools={playlistId ? <PlaylistSettingsStatus controls={playlistSettings} /> : <></>} leaveGuard={playlistId ? playlistSettings.canLeave : undefined} close={() => setPerformance(false)} />}
  </div>
}
