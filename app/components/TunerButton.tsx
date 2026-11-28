"use client"
import { useState } from "react"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { Gauge } from "lucide-react"
import UiText, { useI18n } from "./UiText"
import styles from "./TunerButton.module.css"
const TunerPanel = dynamic(() => import("./TunerPanel"), { loading: () => <p role="status"><UiText text="Učitavam alat..." /></p> })
export default function TunerButton({ label }: { label?: string } = {}) {
  return <TunerControl key={usePathname()} label={label} />
}
function TunerControl({ label }: { label?: string }) {
  const { t } = useI18n(), [open, setOpen] = useState(false)
  const name = label ?? t("Stimer")
  return <><button type="button" className={label ? styles.launch : styles.icon} title={name} aria-label={name} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><Gauge aria-hidden="true" />{label}</button>{open && <TunerPanel close={() => setOpen(false)} />}</>
}
