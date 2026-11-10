"use client"
import { useState } from "react"
import dynamic from "next/dynamic"
import { Video } from "lucide-react"
import UiText, { useI18n } from "./UiText"
const TutorialVideo = dynamic(() => import("./SongTutorialVideo"), { loading: () => <p role="status"><UiText text="Učitavam alat..." /></p> })
export type PublicTutorial = { videoId: string; title: string }
export default function SongTutorialLauncher({ tutorial, onPlay }: { tutorial?: PublicTutorial | null; onPlay?: () => void }) {
  const {t}=useI18n(),[open,setOpen]=useState(false)
  if(!tutorial||!/^[a-zA-Z0-9_-]{11}$/.test(tutorial.videoId))return null
  return <><button type="button" className="ui-button" aria-haspopup="dialog" aria-expanded={open} onClick={()=>{onPlay?.();setOpen(true)}}><Video size={18} aria-hidden="true" />{t("Kako se svira")}</button>{open&&<TutorialVideo tutorial={tutorial} close={()=>setOpen(false)} />}</>
}
