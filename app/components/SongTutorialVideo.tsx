"use client"
import { ExternalLink } from "lucide-react"
import PlaylistDialog from "./PlaylistDialog"
import { useI18n } from "./UiText"
import type { PublicTutorial } from "./SongTutorialLauncher"
import styles from "./SongTutorial.module.css"
export default function SongTutorialVideo({tutorial,close}:{tutorial:PublicTutorial;close:()=>void}) {
  const {t}=useI18n()
  return <PlaylistDialog title="Kako se svira" close={close}>
    {tutorial.title&&<p className={styles.title} translate="no">{tutorial.title}</p>}
    <iframe className={styles.video} src={`https://www.youtube-nocookie.com/embed/${tutorial.videoId}?playsinline=1`} title={tutorial.title||t("Video tutorijal")} allow="encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
    <a className="ui-button" href={`https://www.youtube.com/watch?v=${tutorial.videoId}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={18} aria-hidden="true" />{t("Otvori na YouTube-u")}</a>
  </PlaylistDialog>
}
