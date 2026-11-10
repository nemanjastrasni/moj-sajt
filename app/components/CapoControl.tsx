"use client"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Guitar } from "lucide-react"
import type { SongCapo } from "./useSongCapo"
import UiText from "./UiText"
import PlaylistDialog from "./PlaylistDialog"
import styles from "./CapoControl.module.css"
const CapoPanel = dynamic(() => import("./CapoPanel"), { loading: () => <p role="status"><UiText text="Učitavam capo preporuke..." /></p> })
export default function CapoControl({ capo, disabled = false, dialog = false }: { capo: SongCapo; disabled?: boolean; dialog?: boolean }) {
  const [expanded, setExpanded] = useState(false), { release } = capo
  useEffect(() => () => release(), [release])
  function close() { setExpanded(false); capo.release() }
  return <div className={styles.root}>
    <button type="button" className={styles.button} aria-expanded={expanded} aria-haspopup={dialog ? "dialog" : undefined} disabled={disabled} onClick={() => {
      if (expanded) close(); else { setExpanded(true); void capo.prepare(true) }
    }}><Guitar aria-hidden="true" /><span>Capo</span>{capo.active && <strong>{capo.fret}</strong>}</button>
    {expanded && (dialog ? <PlaylistDialog title="Capo hvatovi" close={close}><CapoPanel capo={capo} disabled={disabled} /></PlaylistDialog> : <CapoPanel capo={capo} disabled={disabled} />)}
  </div>
}
