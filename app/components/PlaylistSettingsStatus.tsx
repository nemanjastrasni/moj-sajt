"use client"
import { Check, LoaderCircle, RefreshCw, Save } from "lucide-react"
import type { PlaylistPlayingControls } from "./usePlaylistSongSettings"
import { useI18n } from "./UiText"
import styles from "./PlaylistClient.module.css"
export default function PlaylistSettingsStatus({ controls }: { controls: PlaylistPlayingControls }) {
  const { t } = useI18n()
  return <div className="my-2 flex min-w-0 flex-wrap items-center gap-2 text-sm" data-playlist-settings>
    {controls.phase === "loading" ? <span role="status" className={styles.actions}><LoaderCircle size={18} />{t("Ucitavam podesavanja playliste...")}</span> : controls.error ? <div role="alert" className={styles.error}><p>{t(controls.error)}</p><button type="button" className={styles.button} onClick={() => void controls.reload()}><RefreshCw />{t("Ucitaj sacuvana podesavanja")}</button></div> : controls.editable ? <>
      {controls.phase === "saving" ? <span role="status" className={styles.actions}><LoaderCircle size={18} />{t("Cuvam podesavanja playliste...")}</span> : controls.pending ? <button type="button" className={styles.button} onClick={() => void controls.save()}><Save />{t("Sacuvaj u ovoj plejlisti")}</button> : <span role="status" className={styles.actions}>{controls.phase === "saved" && <Check size={18} />}{t(controls.phase === "saved" ? "Tonalitet i capo sacuvani u plejlisti." : "Podesavanja ove plejliste")}</span>}
    </> : <span className={styles.muted}>{t("Samo pregled")}</span>}
  </div>
}
