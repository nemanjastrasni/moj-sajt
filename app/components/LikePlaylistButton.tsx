"use client"
import { useState } from "react"
import { Heart } from "lucide-react"
import { musicRequest } from "@/lib/music/client"
import { useI18n } from "./UiText"

export default function LikePlaylistButton({playlistId,initialLiked=false,initialCount=0}:{playlistId:string;initialLiked?:boolean;initialCount?:number}){
  const {t}=useI18n(),[liked,setLiked]=useState(initialLiked),[count,setCount]=useState(initialCount),[busy,setBusy]=useState(false),[error,setError]=useState("")
  return <div><button type="button" className="ui-button" aria-pressed={liked} disabled={busy} title={t("Svidja mi se")} onClick={async()=>{
    if(busy)return
    setBusy(true);setError("")
    try{const result=await musicRequest("/api/listening-playlist-like","POST",{playlistId});if(typeof result.liked!=="boolean")throw Error("Muzika trenutno nije dostupna. Pokusaj ponovo.");setCount(value=>Math.max(0,value+(result.liked===liked?0:result.liked?1:-1)));setLiked(result.liked)}
    catch(cause){setError(cause instanceof Error?cause.message:"Muzika trenutno nije dostupna. Pokusaj ponovo.")}
    finally{setBusy(false)}
  }}><Heart aria-hidden="true" fill={liked?"currentColor":"none"} /><span>{count}</span></button>{error&&<p role="alert" className="mt-2 max-w-48 text-sm text-red-400">{t(error)}</p>}</div>
}
