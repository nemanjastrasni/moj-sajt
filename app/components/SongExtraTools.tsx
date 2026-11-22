"use client"

import Image from "next/image"
import { LoaderCircle, Settings2 } from "lucide-react"
import { useI18n } from "./UiText"
import SongPdfButton from "./SongPdfButton"
import SongPlaylistButton from "./SongPlaylistButton"
import SongReportButton from "./SongReportButton"
import SongTutorialLauncher, { type PublicTutorial } from "./SongTutorialLauncher"
import styles from "./SongToolbar.module.css"

type Props = {
  song: { id: string; title: string; artist: string; lyrics: string; tutorial?: PublicTutorial | null }
  songVersion?: string; disabled: boolean; transpose: number; capo: number | null; textSize: number; chordSize: number
  showVideo: boolean; loadingVideo: boolean; toggleVideo: () => void; openSettings: () => void; onTutorialPlay: () => void
}

// Mounted on demand and retained when collapsed, preserving download links and open-tool state.
export default function SongExtraTools({ song, songVersion, disabled, transpose, capo, textSize, chordSize, showVideo, loadingVideo, toggleVideo, openSettings, onTutorialPlay }: Props) {
  const { t } = useI18n()
  return <>
    <SongPlaylistButton key={song.id} songId={song.id} disabled={disabled} settings={{ transpose, capo }} />
    <SongPdfButton song={song} transpose={transpose} capo={capo} disabled={disabled} textSize={textSize} chordSize={chordSize} />
    <SongTutorialLauncher tutorial={song.tutorial} onPlay={onTutorialPlay} />
    <button type="button" className={styles.videoToggle} data-song-video-toggle disabled={loadingVideo} aria-pressed={showVideo} aria-busy={loadingVideo}
      title={`${t(showVideo ? "Sakrij video" : "Prikazi video")} (YouTube)`}
      aria-label={loadingVideo ? t("Ucitavam video...") : `${t(showVideo ? "Sakrij video" : "Prikazi video")} (YouTube)`} onClick={toggleVideo}>
      <Image src="/brand/youtube-icon-red.png" width={44} height={38} alt="" unoptimized className={styles.videoMark} />
      <span className={styles.videoLabel}>{loadingVideo ? <LoaderCircle className={styles.videoLoading} aria-hidden="true" /> : t("Video")}</span>
    </button>
    {songVersion && <SongReportButton songId={song.id} songVersion={songVersion} title={song.title} artist={song.artist} transpose={transpose} />}
    <button type="button" className={styles.icon} title={t("Podesavanja prikaza")} aria-label={t("Podesavanja prikaza")} aria-haspopup="dialog" onClick={openSettings}><Settings2 /></button>
  </>
}
