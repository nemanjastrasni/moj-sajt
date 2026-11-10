"use client"
import { useState } from "react"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { Gauge } from "lucide-react"
import UiText, { useI18n } from "./UiText"
import styles from "./TunerButton.module.css"
const TunerPanel = dynamic(() => import("./TunerPanel"), { loading: () => <p role="status"><UiText text="Učitavam alat..." /></p> })
export default function TunerButton() { return <TunerControl key={usePathname()} /> }
function TunerControl() {
  const { t } = useI18n(), [open, setOpen] = useState(false)
  return <><button type="button" className={styles.icon} title={t("Stimer")} aria-label={t("Stimer")} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><Gauge /></button>{open && <TunerPanel close={() => setOpen(false)} />}</>
}
