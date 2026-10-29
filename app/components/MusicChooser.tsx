"use client"

import Link from "next/link"
import { useEffect,useState } from "react"
import { useSession } from "next-auth/react"
import { Play } from "lucide-react"
import { musicRequest } from "@/lib/music/client"
import type { MusicSummary } from "@/lib/music/model"
import PlaylistDialog from "./PlaylistDialog"
import { useMusic } from "./MusicContext"
import { useI18n } from "./UiText"
import styles from "./Music.module.css"

export default function MusicChooser(){
  const {data:session}=useSession(),music=useMusic(),{t}=useI18n()
  const [scope,setScope]=useState(session?.user?.id?"mine":"public")
  const [result,setResult]=useState<{scope:string;lists:MusicSummary[]|null;error:string}>({scope,lists:null,error:""})
  const lists=result.scope===scope?result.lists:null,error=result.scope===scope?result.error:""
  useEffect(()=>{
    const controller=new AbortController()
    musicRequest("/api/listening-playlist?scope="+scope,"GET",undefined,controller.signal).then(result=>{
      if(!Array.isArray(result.lists))throw Error("Muzika trenutno nije dostupna. Pokusaj ponovo.")
      if(!controller.signal.aborted)setResult({scope,lists:result.lists,error:""})
    }).catch(cause=>{if(!controller.signal.aborted)setResult({scope,lists:null,error:cause instanceof Error?cause.message:"Muzika trenutno nije dostupna. Pokusaj ponovo."})})
    return()=>controller.abort()
  },[scope])
  return <PlaylistDialog title="Izaberi muziku" close={music.closeChooser}>
    <div className={styles.tabs} role="group" aria-label={t("Muzicke liste")}>
      {session?.user?.id&&<button type="button" className="ui-button" aria-pressed={scope==="mine"} onClick={()=>setScope("mine")}>{t("Moja muzika")}</button>}
      <button type="button" className="ui-button" aria-pressed={scope==="public"} onClick={()=>setScope("public")}>{t("Javne muzicke liste")}</button>
    </div>
    {error?<p role="alert" className={styles.error}>{t(error)}</p>:!lists?<p role="status">{t("Ucitavam muziku...")}</p>:!lists.length?<p className={styles.muted}>{t("Nema muzickih lista u ovom pregledu.")}</p>:<ul className={styles.choices}>{lists.map(list=><li key={list.id}><button type="button" onClick={()=>void music.start(list.id)} disabled={!list.count}><span>{list.name}<small>{list.count} · {t("stavki")}</small></span><Play aria-hidden="true" /></button></li>)}</ul>}
    <Link href="/listening-playlist" onClick={music.closeChooser} className="ui-button mt-4">{t("Uredi moju muziku")}</Link>
  </PlaylistDialog>
}
