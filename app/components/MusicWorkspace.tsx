"use client"

import { type ReactNode } from "react"
import dynamic from "next/dynamic"
import { Headphones,X } from "lucide-react"
import { useMusic } from "./MusicContext"
import UiText from "./UiText"
const MusicChooser=dynamic(()=>import("./MusicChooser"),{loading:()=> <p role="status"><UiText text="Ucitavam muziku..."/></p>})
const YouTubeDock=dynamic(()=>import("./MusicYouTubeDock"),{loading:()=> <div role="status"><UiText text="Ucitavam muziku..."/></div>})
import { useI18n } from "./UiText"
import styles from "./Music.module.css"

export default function MusicWorkspace({children}:{children:ReactNode}){
  const music=useMusic(),open=Boolean(music.queue||music.loading||music.error),{t}=useI18n()
  return <div className={styles.workspace+(open?" "+styles.open:"")} data-music-workspace data-music-open={open}>
    {open&&<aside className={styles.dock} aria-label={t("YouTube plejer")}>
      <div className={styles.dockHeading}><Headphones aria-hidden="true" /><span>{music.queue?.list.name||t("Moja muzika")}</span><button type="button" className={styles.icon} onClick={music.stop} title={t("Zaustavi i zatvori muziku")} aria-label={t("Zaustavi i zatvori muziku")}><X /></button></div>
      {music.loading&&<p role="status">{t("Ucitavam muziku...")}</p>}
      {music.error&&<p role="alert" className={styles.error}>{t(music.error)}</p>}
      {music.queue&&<YouTubeDock />}
      {!music.queue&&<button type="button" className="ui-button" onClick={music.openChooser}>{t("Izaberi muziku")}</button>}
    </aside>}
    <div className={styles.content}>{children}</div>
    {music.chooser&&<MusicChooser />}
  </div>
}
