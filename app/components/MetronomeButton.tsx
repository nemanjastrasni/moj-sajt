"use client"
import { useCallback, useState } from "react"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { Timer } from "lucide-react"
import UiText, { useI18n } from "./UiText"
import styles from "./MetronomeButton.module.css"
const MetronomePanel = dynamic(() => import("./MetronomePanel"), { loading: () => <p role="status"><UiText text="Učitavam alat..." /></p> })
export default function MetronomeButton({ onPlayingChange }: { onPlayingChange?: (playing: boolean) => void }) { return <MetronomeControl key={usePathname()} onPlayingChange={onPlayingChange} /> }
function MetronomeControl({ onPlayingChange }: { onPlayingChange?: (playing: boolean) => void }) {
  const { t } = useI18n(), [open, setOpen] = useState(false), [visible, setVisible] = useState(false), [playing, setPlaying] = useState(false)
  const activeChanged = useCallback((value: boolean) => { setPlaying(value); onPlayingChange?.(value) }, [onPlayingChange])
  function close() { setOpen(false); setVisible(false); activeChanged(false) }
  return <><button type="button" className={styles.icon} data-playing={playing} title={t(playing ? "Metronom radi" : "Metronom")} aria-label={t("Metronom")} aria-haspopup="dialog" aria-expanded={visible} onClick={() => { setOpen(true); setVisible(true) }}><Timer /></button>{open && <MetronomePanel visible={visible} hide={() => setVisible(false)} activeChanged={activeChanged} close={close} />}</>
}
