"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Flag } from "lucide-react"
import UiText, { useI18n } from "./UiText"
import styles from "./SongReports.module.css"

const SongReportForm=dynamic(()=>import("./SongReportForm"),{loading:()=> <p role="status"><UiText text="Učitavam alat..." /></p>})

type Props = { songId: string; songVersion: string; title: string; artist: string; transpose: number }
export default function SongReportButton(props: Props) {
  const { t } = useI18n(), { data: session, status } = useSession(), router = useRouter()
  const [openedAt, setOpenedAt] = useState<number | null>(null), [notice, setNotice] = useState(false)
  return <>
    <button type="button" className={`${styles.button} ${styles.reportTrigger}`} data-song-report disabled={status === "loading"} aria-haspopup="dialog" onClick={() => {
      if (!session) { router.push("/login?callbackUrl=" + encodeURIComponent(window.location.pathname + window.location.search + window.location.hash)); return }
      setNotice(false); setOpenedAt(props.transpose)
    }}><Flag aria-hidden="true" />{t("Prijavi gresku")}</button>
    {notice && <span role="status" className={styles.success}><CheckCircle2 aria-hidden="true" />{t("Prijava je poslata administratoru.")}</span>}
    {openedAt !== null && <SongReportForm {...props} transpose={openedAt} close={() => setOpenedAt(null)} sent={() => { setOpenedAt(null); setNotice(true) }} />}
  </>
}
