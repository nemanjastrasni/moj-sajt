"use client"
import { useState } from "react"
import dynamic from "next/dynamic"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ListPlus, Star } from "lucide-react"
import UiText, { useI18n } from "./UiText"
import type { PlayingValues } from "@/lib/playlists/settings"
import styles from "./PlaylistClient.module.css"
const Action = dynamic(()=>import("./SongPlaylistAction"),{loading:()=> <p role="status"><UiText text="Učitavam alat..." /></p>})
type Props={songId:string;settings?:PlayingValues;disabled?:boolean}
export default function SongPlaylistButton(props:Props){
  const {data:session,status}=useSession()
  return <Launcher key={JSON.stringify([props.songId,status,session?.user?.id])} {...props}/>
}
function Launcher({disabled=false,...props}:Props){
  const {t}=useI18n(),{data:session,status}=useSession(),router=useRouter(),[open,setOpen]=useState(false),[added,setAdded]=useState(false)
  return <><button type="button" className={styles.button} data-in-playlist={added} title={t(added?"U tvojim plejlistama":"Dodaj u playlistu")} disabled={disabled||status==="loading"} aria-expanded={open} aria-haspopup="dialog" onClick={()=>{
    if(!session){router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname+window.location.search)}`);return}
    setOpen(value=>!value)
  }}>{added?<Star fill="currentColor"/>:<ListPlus/>}{t("+ Playlist")}</button>{open&&<Action {...props} initialOpen onClose={()=>setOpen(false)} onMembership={setAdded}/>}</>
}
